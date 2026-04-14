"""
CipherTrust — Compliance Routes
"""
import io
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib import colors  # type: ignore[import-untyped]
from reportlab.lib.pagesizes import A4  # type: ignore[import-untyped]
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet  # type: ignore[import-untyped]
from reportlab.lib.units import mm  # type: ignore[import-untyped]
from reportlab.platypus import (  # type: ignore[import-untyped]
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.blockchain.algorand_client import algorand
from app.core.database import get_db
from app.models.user import (
    ComplianceCertificate, ConsentRecord, Organization, ZKProof
)
from app.schemas.schemas import CertificateResponse, ComplianceSummary

router = APIRouter()


@router.post("/{org_id}/issue-certificate", response_model=CertificateResponse, status_code=201)
async def issue_certificate(
    org_id: int,
    proof_id: int,
    regulation: str = "DPDPA",
    db: AsyncSession = Depends(get_db),
):
    """Issue a compliance certificate (NFT/ASA) for a verified proof."""
    result = await db.execute(
        select(ZKProof).where(
            ZKProof.id == proof_id,
            ZKProof.organization_id == org_id,
            ZKProof.status == "verified",
        )
    )
    proof = result.scalar_one_or_none()
    if not proof:
        raise HTTPException(
            status_code=404,
            detail="Verified proof not found. Submit and verify a proof first.",
        )

    now = datetime.now(timezone.utc)
    cert = ComplianceCertificate(
        organization_id=org_id,
        proof_id=proof_id,
        status="compliant",
        regulation=regulation,
        certificate_metadata={
            "proof_hash": proof.proof_hash,
            "public_inputs": proof.public_inputs,
            "issued_by": "CipherTrust",
            "regulation": regulation,
        },
        issued_at=now,
        expires_at=now + timedelta(days=365),
    )
    db.add(cert)
    await db.flush()

    try:
        onchain = algorand.issue_certificate(org_id, proof_id, regulation)
        cert.txn_id = onchain["txn_id"]  # type: ignore[assignment]
        cert.asset_id = onchain.get("asset_id")  # type: ignore[assignment]
        await db.flush()
        await db.refresh(cert)
        return cert
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Certificate issuance failed: {str(e)}")


@router.get("/{org_id}/certificates", response_model=list[CertificateResponse])
async def list_certificates(org_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ComplianceCertificate).where(
            ComplianceCertificate.organization_id == org_id
        )
    )
    return result.scalars().all()


@router.get("/{org_id}/summary", response_model=ComplianceSummary)
async def compliance_summary(org_id: int, db: AsyncSession = Depends(get_db)):
    """Full compliance summary for regulator / auditor view."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    total_consents = await db.scalar(
        select(func.count()).where(ConsentRecord.organization_id == org_id)
    )
    active_consents = await db.scalar(
        select(func.count()).where(
            ConsentRecord.organization_id == org_id,
            ConsentRecord.status == "active",
        )
    )
    total_proofs = await db.scalar(
        select(func.count()).where(ZKProof.organization_id == org_id)
    )
    verified_proofs = await db.scalar(
        select(func.count()).where(
            ZKProof.organization_id == org_id,
            ZKProof.status == "verified",
        )
    )

    cert_result = await db.execute(
        select(ComplianceCertificate)
        .where(ComplianceCertificate.organization_id == org_id)
        .order_by(ComplianceCertificate.issued_at.desc())
        .limit(1)
    )
    latest_cert = cert_result.scalar_one_or_none()

    is_compliant = (
        latest_cert is not None
        and latest_cert.status == "compliant"
        and (latest_cert.expires_at is None or latest_cert.expires_at > datetime.now(timezone.utc))
    )

    return ComplianceSummary(
        organization_id=org_id,
        organization_name=org.name,  # type: ignore[arg-type]
        compliance_score=org.compliance_score,  # type: ignore[arg-type]
        total_consents=total_consents or 0,
        active_consents=active_consents or 0,
        total_proofs=total_proofs or 0,
        verified_proofs=verified_proofs or 0,
        latest_certificate=latest_cert,  # type: ignore[arg-type]
        is_compliant=is_compliant,  # type: ignore[arg-type]
    )


@router.get("/verify/{txn_id}")
async def verify_by_txn(txn_id: str):
    """Public endpoint — verify a compliance proof by Algorand transaction ID."""
    try:
        txn = algorand.get_transaction(txn_id)
        return {
            "txn_id": txn_id,
            "verified": True,
            "block": txn.get("confirmed-round"),
            "timestamp": txn.get("round-time"),
            "note": txn.get("txn", {}).get("note"),
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Transaction not found: {str(e)}")


# ─── PDF Certificate Download ─────────────────────────────────────────────────

@router.get("/{org_id}/certificates/{cert_id}/pdf")
async def download_certificate_pdf(
    org_id: int,
    cert_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Generate and stream a compliance certificate as a PDF."""
    result = await db.execute(
        select(ComplianceCertificate).where(
            ComplianceCertificate.id == cert_id,
            ComplianceCertificate.organization_id == org_id,
        )
    )
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    # Fetch org name
    org_result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = org_result.scalar_one_or_none()
    org_name = org.name if org else f"Org #{org_id}"

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=25 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle("CertTitle", parent=styles["Title"], fontSize=22,
                                  textColor=colors.HexColor("#4f46e5"), spaceAfter=4)
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=11,
                                     textColor=colors.HexColor("#64748b"), spaceAfter=12)
    heading_style = ParagraphStyle("SectionHead", parent=styles["Heading2"], fontSize=13,
                                    textColor=colors.HexColor("#1e293b"), spaceBefore=14, spaceAfter=6)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10,
                                 textColor=colors.HexColor("#334155"), leading=14)
    small_style = ParagraphStyle("Small", parent=styles["Normal"], fontSize=8,
                                  textColor=colors.HexColor("#94a3b8"))

    elements = []

    # Header
    elements.append(Paragraph("CipherTrust", title_style))
    elements.append(Paragraph("Privacy-Preserving RegTech Protocol on Algorand", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    elements.append(Spacer(1, 8 * mm))

    # Certificate title
    cert_title_style = ParagraphStyle("CertName", parent=styles["Title"], fontSize=18,
                                       textColor=colors.HexColor("#0f172a"), spaceAfter=4)
    elements.append(Paragraph(f"{cert.regulation} Compliance Certificate", cert_title_style))
    status_color = "#10b981" if cert.status in ("compliant", "active") else "#ef4444"
    elements.append(Paragraph(
        f'Status: <font color="{status_color}"><b>{cert.status.upper()}</b></font>',
        body_style,
    ))
    elements.append(Spacer(1, 6 * mm))

    # Details table
    meta = cert.certificate_metadata or {}
    issued_str = cert.issued_at.strftime("%d %B %Y, %H:%M UTC") if cert.issued_at else "—"  # type: ignore[truthy-bool]
    expires_str = cert.expires_at.strftime("%d %B %Y, %H:%M UTC") if cert.expires_at else "—"  # type: ignore[truthy-bool]

    data = [
        ["Field", "Value"],
        ["Certificate ID", f"#{cert.id}"],
        ["Organisation", org_name],
        ["Regulation", cert.regulation],
        ["Proof ID", f"#{cert.proof_id}"],
        ["Proof Hash", meta.get("proof_hash", "—")],
        ["Issued At", issued_str],
        ["Expires At", expires_str],
        ["Algorand Txn ID", cert.txn_id or "—"],
        ["Asset ID (ASA)", str(cert.asset_id) if cert.asset_id else "—"],  # type: ignore[truthy-bool]
        ["Network", "Algorand TestNet"],
    ]

    table = Table(data, colWidths=[130, 340])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4f46e5")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 8 * mm))

    # Verification section
    elements.append(Paragraph("On-Chain Verification", heading_style))
    if cert.txn_id:  # type: ignore[truthy-bool]
        lora_url = f"https://lora.algokit.io/testnet/transaction/{cert.txn_id}"
        elements.append(Paragraph(
            f'This certificate is anchored on the Algorand blockchain. '
            f'Verify at: <link href="{lora_url}" color="#4f46e5">{lora_url}</link>',
            body_style,
        ))
    else:
        elements.append(Paragraph("This certificate has not been anchored on-chain yet.", body_style))

    elements.append(Spacer(1, 12 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1")))
    elements.append(Spacer(1, 3 * mm))
    elements.append(Paragraph(
        f"Generated by CipherTrust · {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')} · "
        "This is a cryptographic compliance certificate. Tamper-evident via Algorand.",
        small_style,
    ))

    doc.build(elements)
    buf.seek(0)

    filename = f"CipherTrust_Certificate_{cert.id}_{cert.regulation}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
