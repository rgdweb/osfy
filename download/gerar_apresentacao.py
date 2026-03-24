from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.units import inch, cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Registrar fontes
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))

# Criar documento
doc = SimpleDocTemplate(
    "/home/z/my-project/download/OSFY-Apresentacao-Clientes.pdf",
    pagesize=A4,
    rightMargin=2*cm,
    leftMargin=2*cm,
    topMargin=2*cm,
    bottomMargin=2*cm
)

# Estilos
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    name='TitleStyle',
    fontName='DejaVuSans-Bold',
    fontSize=28,
    alignment=TA_CENTER,
    spaceAfter=20,
    textColor=colors.HexColor('#10B981')
)

subtitle_style = ParagraphStyle(
    name='SubtitleStyle',
    fontName='DejaVuSans',
    fontSize=16,
    alignment=TA_CENTER,
    spaceAfter=30,
    textColor=colors.HexColor('#64748B')
)

heading_style = ParagraphStyle(
    name='HeadingStyle',
    fontName='DejaVuSans-Bold',
    fontSize=16,
    spaceBefore=20,
    spaceAfter=10,
    textColor=colors.HexColor('#1E293B')
)

body_style = ParagraphStyle(
    name='BodyStyle',
    fontName='DejaVuSans',
    fontSize=11,
    leading=16,
    alignment=TA_LEFT,
    spaceAfter=8
)

# Cores da tabela
TABLE_HEADER_COLOR = colors.HexColor('#10B981')
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = colors.HexColor('#F0FDF4')

story = []

# ========== CAPA ==========
story.append(Spacer(1, 100))
story.append(Paragraph("OSFY", title_style))
story.append(Paragraph("Sistema de Gestao para Assistencias Tecnicas", subtitle_style))
story.append(Spacer(1, 40))
story.append(Paragraph("Apresentacao para Clientes", ParagraphStyle(
    name='Center',
    fontName='DejaVuSans',
    fontSize=14,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#64748B')
)))
story.append(Spacer(1, 60))
story.append(Paragraph("Simples. Completo. Acessivel.", ParagraphStyle(
    name='Slogan',
    fontName='DejaVuSans-Bold',
    fontSize=18,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#10B981')
)))
story.append(PageBreak())

# ========== O QUE É ==========
story.append(Paragraph("O que e o OSFY?", heading_style))
story.append(Paragraph(
    "O OSFY e um sistema completo de gestao desenvolvido especificamente para assistencias tecnicas "
    "de celulares, computadores, eletrodomesticos e outros equipamentos. Uma solucao moderna, facil de usar "
    "e acessivel de qualquer lugar - no computador, tablet ou celular.",
    body_style
))

# ========== FUNCIONALIDADES ==========
story.append(Paragraph("Funcionalidades Principais", heading_style))

# Tabela de funcionalidades
func_data = [
    [Paragraph("<b>Recurso</b>", ParagraphStyle(name='th', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT)),
     Paragraph("<b>Descricao</b>", ParagraphStyle(name='th', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT))],
    [Paragraph("Gestao de OS", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Cadastre, acompanhe e gerencie todas as Ordens de Servico", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Codigo de Acompanhamento", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Cliente acompanha o status da OS pelo celular sem ligar", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Assinatura Digital", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Cliente assina na tela ao retirar o equipamento", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Pagamentos Online", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10)),
     Paragraph("PIX, Boleto e Cartao de Credito - cliente paga de qualquer lugar", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("PDV Integrado", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Venda produtos, controle estoque e caixa", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Pagina da Loja", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Sua loja visivel no Google com pagina personalizada", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Dashboard", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Visualize faturamento, OS do dia, metricas importantes", ParagraphStyle(name='td', fontName='DejaVuSans', fontSize=10))],
]

func_table = Table(func_data, colWidths=[4*cm, 12*cm])
func_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 7), (-1, 7), TABLE_ROW_EVEN),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
]))
story.append(func_table)
story.append(Spacer(1, 20))

# ========== GESTAO DE OS ==========
story.append(Paragraph("1. Gestao de Ordens de Servico", heading_style))
story.append(Paragraph(
    "Sistema completo para gerenciar todo o ciclo de vida das Ordens de Servico, desde o recebimento "
    "do equipamento ate a entrega ao cliente. Cada OS possui codigo unico para acompanhamento, status "
    "em tempo real, fotos do equipamento, historico completo de alteracoes e assinatura digital.",
    body_style
))

status_items = [
    ["Recebido", "Equipamento chegou na loja"],
    ["Em Diagnostico", "Tecnico avaliando o problema"],
    ["Aguardando Aprovacao", "Orcamento enviado ao cliente"],
    ["Em Reparo", "Conserto em andamento"],
    ["Concluido", "Pronto para retirada"],
]
status_data = [[Paragraph(f"<b>{s[0]}</b>", ParagraphStyle(name='st', fontName='DejaVuSans-Bold', fontSize=10)),
                Paragraph(s[1], ParagraphStyle(name='st2', fontName='DejaVuSans', fontSize=10))] for s in status_items]
status_data.insert(0, [Paragraph("<b>Status</b>", ParagraphStyle(name='sth', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT)),
                       Paragraph("<b>Significado</b>", ParagraphStyle(name='sth', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT))])

status_table = Table(status_data, colWidths=[4*cm, 12*cm])
status_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(status_table)
story.append(Spacer(1, 20))

# ========== PAGAMENTOS ==========
story.append(Paragraph("2. Pagamentos Online Integrados", heading_style))
story.append(Paragraph(
    "O cliente pode pagar a OS de qualquer lugar, sem precisar ir ate a loja. O sistema gera PIX com QR Code, "
    "Boleto bancario ou Link para Cartao de Credito. Tudo integrado - quando o pagamento e confirmado, "
    "a OS e atualizada automaticamente.",
    body_style
))

pag_data = [
    [Paragraph("<b>Forma</b>", ParagraphStyle(name='ph', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT)),
     Paragraph("<b>Recurso</b>", ParagraphStyle(name='ph', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT)),
     Paragraph("<b>Prazo</b>", ParagraphStyle(name='ph', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT))],
    [Paragraph("PIX", ParagraphStyle(name='pd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("QR Code + Codigo Copia/Cola", ParagraphStyle(name='pd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Instantaneo", ParagraphStyle(name='pd', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Boleto", ParagraphStyle(name='pd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("PDF para impressao ou envio", ParagraphStyle(name='pd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("1-3 dias uteis", ParagraphStyle(name='pd', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Cartao", ParagraphStyle(name='pd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Parcelamento em ate 12x", ParagraphStyle(name='pd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Instantaneo", ParagraphStyle(name='pd', fontName='DejaVuSans', fontSize=10))],
]
pag_table = Table(pag_data, colWidths=[3*cm, 8*cm, 5*cm])
pag_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
]))
story.append(pag_table)
story.append(PageBreak())

# ========== PDV ==========
story.append(Paragraph("3. PDV - Ponto de Venda", heading_style))
story.append(Paragraph(
    "Sistema completo de frente de caixa para venda de produtos como capas, carregadores, fones de ouvido "
    "e acessorios em geral. Controle de estoque automatico, categorias de produtos, historico de vendas "
    "e controle de caixa com abertura e fechamento diario.",
    body_style
))

pdv_items = [
    "Cadastro de produtos com codigo de barras",
    "Categorias para organizar os produtos",
    "Controle de estoque automatico",
    "Historico completo de vendas",
    "Abertura e fechamento de caixa",
    "Recibo de venda para impressao ou WhatsApp",
]
for item in pdv_items:
    story.append(Paragraph(f"- {item}", body_style))
story.append(Spacer(1, 15))

# ========== PAGINA DA LOJA ==========
story.append(Paragraph("4. Pagina Publica da Loja", heading_style))
story.append(Paragraph(
    "Cada loja recebe uma pagina personalizada que aparece nas buscas do Google. O cliente pode ver "
    "informacoes da loja, horarios de funcionamento, tipos de servico oferecidos, avaliacoes de outros "
    "clientes e acompanhar sua OS digitando o codigo.",
    body_style
))

story.append(Paragraph(
    "Exemplo: tec-os.vercel.app/loja/nome-da-sua-loja",
    ParagraphStyle(name='url', fontName='DejaVuSans', fontSize=10, textColor=colors.HexColor('#10B981'), spaceBefore=10)
))

pagina_items = [
    "Logo e nome da loja",
    "Endereco, telefone e WhatsApp",
    "Horario de funcionamento",
    "Tipos de servico oferecidos",
    "Avaliacoes e notas dos clientes",
    "Campo para acompanhar OS",
]
for item in pagina_items:
    story.append(Paragraph(f"- {item}", body_style))
story.append(Spacer(1, 15))

# ========== DIFERENCIAIS ==========
story.append(Paragraph("Por que escolher o OSFY?", heading_style))

dif_data = [
    [Paragraph("<b>Diferencial</b>", ParagraphStyle(name='dh', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT)),
     Paragraph("<b>Beneficio</b>", ParagraphStyle(name='dh', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT))],
    [Paragraph("Facil de usar", ParagraphStyle(name='dd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Interface simples, sem necessidade de treinamento", ParagraphStyle(name='dd', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Acesse de qualquer lugar", ParagraphStyle(name='dd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Funciona no celular, tablet ou computador", ParagraphStyle(name='dd', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Sem instalacao", ParagraphStyle(name='dd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("100% online, nao precisa baixar nada", ParagraphStyle(name='dd', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Atualizacoes automaticas", ParagraphStyle(name='dd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Sempre com as novidades, sem custo extra", ParagraphStyle(name='dd', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Suporte incluso", ParagraphStyle(name='dd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Ajuda sempre que precisar", ParagraphStyle(name='dd', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Backup automatico", ParagraphStyle(name='dd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Dados salvos na nuvem com seguranca", ParagraphStyle(name='dd', fontName='DejaVuSans', fontSize=10))],
]
dif_table = Table(dif_data, colWidths=[5*cm, 11*cm])
dif_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(dif_table)
story.append(PageBreak())

# ========== PLANOS ==========
story.append(Paragraph("Planos e Valores", heading_style))

planos_data = [
    [Paragraph("<b>Plano</b>", ParagraphStyle(name='plh', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT)),
     Paragraph("<b>Valor</b>", ParagraphStyle(name='plh', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT)),
     Paragraph("<b>Economia</b>", ParagraphStyle(name='plh', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT))],
    [Paragraph("Mensal", ParagraphStyle(name='pld', fontName='DejaVuSans', fontSize=10)),
     Paragraph("R$ 29,90/mes", ParagraphStyle(name='pld', fontName='DejaVuSans', fontSize=10)),
     Paragraph("-", ParagraphStyle(name='pld', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Anual", ParagraphStyle(name='pld', fontName='DejaVuSans', fontSize=10)),
     Paragraph("R$ 290,00/ano", ParagraphStyle(name='pld', fontName='DejaVuSans', fontSize=10)),
     Paragraph("2 meses gratis", ParagraphStyle(name='pld', fontName='DejaVuSans', fontSize=10))],
]
planos_table = Table(planos_data, colWidths=[5*cm, 5*cm, 6*cm])
planos_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
]))
story.append(planos_table)
story.append(Spacer(1, 20))

story.append(Paragraph(
    "Periodo de Teste GRATUITO: 7 dias para experimentar todas as funcionalidades!",
    ParagraphStyle(name='trial', fontName='DejaVuSans-Bold', fontSize=12, textColor=colors.HexColor('#10B981'))
))
story.append(Spacer(1, 25))

# ========== PARA QUEM É ==========
story.append(Paragraph("Para quem e o OSFY?", heading_style))

ramos_data = [
    [Paragraph("<b>Tipo de Negocio</b>", ParagraphStyle(name='rh', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT)),
     Paragraph("<b>Uso Principal</b>", ParagraphStyle(name='rh', fontName='DejaVuSans-Bold', fontSize=10, textColor=TABLE_HEADER_TEXT))],
    [Paragraph("Assistencia de Celulares", ParagraphStyle(name='rd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Reparos, troca de tela, baterias", ParagraphStyle(name='rd', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Assistencia de Computadores", ParagraphStyle(name='rd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Formatacao, upgrades, reparos", ParagraphStyle(name='rd', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Eletrodomesticos", ParagraphStyle(name='rd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("TVs, geladeiras, maquinas", ParagraphStyle(name='rd', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Videogames", ParagraphStyle(name='rd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Consoles, controles", ParagraphStyle(name='rd', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Relojoarias", ParagraphStyle(name='rd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Troca de bateria, reparos", ParagraphStyle(name='rd', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("Oficinas em Geral", ParagraphStyle(name='rd', fontName='DejaVuSans', fontSize=10)),
     Paragraph("Qualquer tipo de reparo", ParagraphStyle(name='rd', fontName='DejaVuSans', fontSize=10))],
]
ramos_table = Table(ramos_data, colWidths=[6*cm, 10*cm])
ramos_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(ramos_table)
story.append(PageBreak())

# ========== RESUMO ==========
story.append(Paragraph("Resumo das Funcionalidades", heading_style))
story.append(Spacer(1, 10))

story.append(Paragraph("Para o Lojista:", ParagraphStyle(name='subh', fontName='DejaVuSans-Bold', fontSize=12, textColor=colors.HexColor('#1E293B'), spaceBefore=15)))
resumo_lojista = [
    "Gestao completa de Ordens de Servico",
    "Controle de clientes e historico",
    "PDV para venda de produtos",
    "Controle de estoque e caixa",
    "Pagamentos online integrados (PIX, Boleto, Cartao)",
    "Pagina publica da loja indexada no Google",
    "Dashboard com relatorios e metricas",
    "Impressao de OS e recibos",
    "Assinatura digital do cliente",
    "Fotos do equipamento (antes/depois)",
    "Acesso de qualquer dispositivo",
]
for item in resumo_lojista:
    story.append(Paragraph(f"- {item}", body_style))

story.append(Paragraph("Para o Cliente:", ParagraphStyle(name='subh', fontName='DejaVuSans-Bold', fontSize=12, textColor=colors.HexColor('#1E293B'), spaceBefore=15)))
resumo_cliente = [
    "Acompanha OS pelo celular com codigo unico",
    "Paga online (PIX, Boleto, Cartao)",
    "Assina digitalmente na retirada",
    "Avalia o atendimento",
    "Ve historico de servicos",
]
for item in resumo_cliente:
    story.append(Paragraph(f"- {item}", body_style))

story.append(Spacer(1, 30))

# ========== CONTATO ==========
story.append(Paragraph("Entre em Contato", heading_style))
story.append(Paragraph(
    "Experimente GRATIS por 7 dias - sem compromisso, sem cartao de credito!",
    ParagraphStyle(name='cta', fontName='DejaVuSans-Bold', fontSize=14, textColor=colors.HexColor('#10B981'), alignment=TA_CENTER)
))
story.append(Spacer(1, 20))

contato_data = [
    [Paragraph("<b>Site</b>", ParagraphStyle(name='ch', fontName='DejaVuSans-Bold', fontSize=10)),
     Paragraph("https://tec-os.vercel.app", ParagraphStyle(name='cd', fontName='DejaVuSans', fontSize=10, textColor=colors.HexColor('#10B981')))],
    [Paragraph("<b>Email</b>", ParagraphStyle(name='ch', fontName='DejaVuSans-Bold', fontSize=10)),
     Paragraph("suporte@tecos.com.br", ParagraphStyle(name='cd', fontName='DejaVuSans', fontSize=10))],
    [Paragraph("<b>WhatsApp</b>", ParagraphStyle(name='ch', fontName='DejaVuSans-Bold', fontSize=10)),
     Paragraph("(11) 99999-9999", ParagraphStyle(name='cd', fontName='DejaVuSans', fontSize=10))],
]
contato_table = Table(contato_data, colWidths=[4*cm, 12*cm])
contato_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0FDF4')),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#10B981')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
]))
story.append(contato_table)

story.append(Spacer(1, 40))
story.append(Paragraph("OSFY - Sistema de Gestao para Assistencias Tecnicas", ParagraphStyle(
    name='footer',
    fontName='DejaVuSans-Bold',
    fontSize=12,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#10B981')
)))
story.append(Paragraph("Simples. Completo. Acessivel.", ParagraphStyle(
    name='footer2',
    fontName='DejaVuSans',
    fontSize=10,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#64748B')
)))

# Build PDF
doc.build(story)
print("PDF gerado com sucesso!")
