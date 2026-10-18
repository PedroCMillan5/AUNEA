"""PDF must disclose its nonpublishable state using the shared readiness gate."""
from unittest.mock import patch
from aunea_backend import pdf_export
from aunea_backend.orchestrator import Orchestrator
from test_pdf_export import fixture_engagement

def test_pdf_discloses_draft_status_without_recalculating_any_engine():
    diagnostic=Orchestrator().diagnose(fixture_engagement())
    captured=[]
    real=pdf_export.Paragraph
    def collect(content,style):
        captured.append(content)
        return real(content,style)
    with patch.object(pdf_export,'Paragraph',side_effect=collect):
        data=pdf_export.PDFExporter().export(diagnostic)
    assert data.startswith(b'%PDF-')
    assert any('BORRADOR NO AUTORIZADO PARA ENTREGA AL CLIENTE' in x for x in captured)
    assert any('Estado del paquete: DRAFT' in x for x in captured)
