import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { join } from "path"
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, WidthType, BorderStyle, ShadingType,
  convertMillimetersToTwip, VerticalAlign, TableLayoutType
} from "docx"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const VERT = "0a2e1a"
const OR = "d4a920"
const GRIS = "555555"
const BEIGE = "f5f5f0"
const BEIGE2 = "f0f0eb"

function mm(n) { return convertMillimetersToTwip(n) }

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "auto" }
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER }
const GRID_BORDER = { style: BorderStyle.SINGLE, size: 2, color: "cccccc" }
const GRID_BORDERS = { top: GRID_BORDER, bottom: GRID_BORDER, left: GRID_BORDER, right: GRID_BORDER, insideHorizontal: GRID_BORDER, insideVertical: GRID_BORDER }

function shading(fill) {
  return { type: ShadingType.CLEAR, color: "auto", fill }
}

function runs(...items) {
  return items.map(item => {
    if (typeof item === "string") return new TextRun({ text: item, size: 19 })
    return new TextRun({ text: item.text || "", size: item.size || 19, bold: item.bold, italics: item.italic, color: item.color, break: item.break })
  })
}

function para(children, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before ?? 60, after: opts.after ?? 60 },
    ...(opts.bullet ? { bullet: { level: 0 } } : {}),
    children: Array.isArray(children) ? children : [children]
  })
}

function secTitle(text) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: VERT, space: 4 } },
    children: [new TextRun({ text, bold: true, size: 22, color: VERT })]
  })
}

function bullet(text) {
  return para(new TextRun({ text, size: 19 }), { bullet: true, before: 50, after: 50 })
}

function spacer(before = 120) {
  return new Paragraph({ spacing: { before, after: 0 }, children: [] })
}

export async function GET(req) {
  try {
    const url         = new URL(req.url)
    const devisId     = url.searchParams.get("devisId")
    const prixAnnuel  = parseInt(url.searchParams.get("prixAnnuel") || "200000")
    const prixTrim    = parseInt(url.searchParams.get("prixTrimestre") || "50000")
    const formule     = url.searchParams.get("formule") || "Formule Intégrale"
    const passages    = parseInt(url.searchParams.get("passages") || "4")
    const controles   = parseInt(url.searchParams.get("controles") || "8")
    const duree       = parseInt(url.searchParams.get("duree") || "12")

    if (!devisId) return NextResponse.json({ error: "devisId requis" }, { status: 400 })

    const { data: devis } = await supabase
      .from("devis")
      .select("*, clients(*)")
      .eq("id", devisId)
      .single()

    if (!devis) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 })

    const client     = devis.clients || {}
    const nomClient  = [client.prenom, client.nom].filter(Boolean).join(" ")
    const entreprise = client.entreprise || nomClient
    const prixRef    = prixTrim * 4
    const remisePct  = prixRef > 0 ? Math.round((1 - prixAnnuel / prixRef) * 100) : 0
    const montant    = (devis.montant_total || devis.montant || 0).toLocaleString("fr-FR")

    let logoData = null
    try {
      logoData = readFileSync(join(process.cwd(), "public", "logo-gse.jpeg"))
    } catch {}

    // Helper: party cell
    function partyCell(titre, rows, fill = BEIGE) {
      return new TableCell({
        shading: shading(fill),
        borders: NO_BORDERS,
        margins: { top: mm(3), bottom: mm(3), left: mm(4), right: mm(4) },
        children: [
          para(new TextRun({ text: titre, bold: true, size: 20, color: VERT }), { align: AlignmentType.CENTER, before: 80, after: 60 }),
          ...rows.map(([k, v]) => para([
            new TextRun({ text: k + " : ", bold: true, size: 18, color: GRIS }),
            new TextRun({ text: v || "_______________", size: 18 })
          ], { before: 40, after: 40 }))
        ]
      })
    }

    // Helper: finance row
    function finRow(label, value, header = false, bg = null) {
      const fill = header ? VERT : (bg || "ffffff")
      const textColor = header ? OR : undefined
      return new TableRow({
        children: [
          new TableCell({
            shading: shading(fill),
            borders: NO_BORDERS,
            margins: { top: mm(2), bottom: mm(2), left: mm(3), right: mm(3) },
            children: [para(new TextRun({ text: label, bold: header, size: 18, color: textColor }), { before: 60, after: 60 })]
          }),
          new TableCell({
            shading: shading(fill),
            borders: NO_BORDERS,
            margins: { top: mm(2), bottom: mm(2), left: mm(3), right: mm(3) },
            children: [para(new TextRun({ text: value, bold: header, size: 18, color: textColor }), { align: AlignmentType.CENTER, before: 60, after: 60 })]
          })
        ]
      })
    }

    // Helper: services row
    function servRow(freq, nature, details, bg = "ffffff") {
      return new TableRow({
        children: [
          new TableCell({
            shading: shading(bg),
            margins: { top: mm(2), bottom: mm(2), left: mm(3), right: mm(3) },
            children: [para(new TextRun({ text: freq, size: 17 }), { before: 60, after: 60 })]
          }),
          new TableCell({
            shading: shading(bg),
            margins: { top: mm(2), bottom: mm(2), left: mm(3), right: mm(3) },
            children: [para(new TextRun({ text: nature, size: 17 }), { before: 60, after: 60 })]
          }),
          new TableCell({
            shading: shading(bg),
            margins: { top: mm(2), bottom: mm(2), left: mm(3), right: mm(3) },
            children: details.map(d => para(new TextRun({ text: d, size: 17 }), { before: 30, after: 30 }))
          })
        ]
      })
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: mm(18), bottom: mm(18), left: mm(22), right: mm(22) }
          }
        },
        children: [

          // ── EN-TÊTE ──
          new Table({
            layout: TableLayoutType.FIXED,
            borders: NO_BORDERS,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({
              children: [
                new TableCell({
                  width: { size: mm(32), type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  borders: NO_BORDERS,
                  children: [
                    logoData
                      ? new Paragraph({ spacing: { before: 0, after: 0 }, children: [new ImageRun({ data: logoData, transformation: { width: mm(26), height: mm(26) }, type: "jpg" })] })
                      : spacer(0)
                  ]
                }),
                new TableCell({
                  verticalAlign: VerticalAlign.CENTER,
                  borders: NO_BORDERS,
                  margins: { left: mm(4) },
                  children: [
                    para(new TextRun({ text: "GLOBAL SOLUTIONS ENTREPRISE", bold: true, size: 26, color: VERT }), { before: 0, after: 40 }),
                    para(new TextRun({ text: "Dératisation · Désinsectisation · Désinfection", italics: true, size: 18, color: GRIS }), { before: 0, after: 40 }),
                    para(new TextRun({ text: "Agrément État du Bénin — N° APA-26-025/CNGP-BEN", bold: true, size: 18, color: OR }), { before: 0, after: 40 }),
                    para(new TextRun({ text: "Ilot 3535, Cotonou  |  +229 53 04 79 50  |  contact@phyto-benin.com  |  RCCM RB/COT/24 B 38910", size: 16, color: GRIS }), { before: 0, after: 0 }),
                  ]
                })
              ]
            })]
          }),

          spacer(140),

          // ── TITRE ──
          new Table({
            layout: TableLayoutType.FIXED,
            borders: NO_BORDERS,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({
              children: [new TableCell({
                shading: shading(VERT),
                borders: NO_BORDERS,
                margins: { top: mm(4), bottom: mm(4), left: mm(5), right: mm(5) },
                children: [para(new TextRun({ text: "CONTRAT D'ENTRETIEN ANNUEL — PLAN HYGIÈNE ALIMENTAIRE", bold: true, size: 26, color: OR }), { align: AlignmentType.CENTER, before: 0, after: 0 })]
              })]
            })]
          }),

          spacer(140),

          // ── RÉFÉRENCES ──
          new Table({
            layout: TableLayoutType.FIXED,
            borders: NO_BORDERS,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({
              children: [
                ["Réf. contrat", "CONT-GSE-2026-____"],
                ["Date de signature", "___ / ___ / 2026"],
                ["Durée", duree + " mois"]
              ].map(([label, value]) => new TableCell({
                shading: shading(BEIGE),
                borders: NO_BORDERS,
                margins: { top: mm(2), bottom: mm(2), left: mm(3), right: mm(3) },
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 60, after: 60 },
                  children: [
                    new TextRun({ text: label + "\n", size: 16, color: GRIS }),
                    new TextRun({ text: value, bold: true, size: 20, color: VERT, break: 1 })
                  ]
                })]
              }))
            })]
          }),

          spacer(140),

          // ── ART 1 ─ PARTIES ──
          secTitle("ARTICLE 1 — PARTIES CONTRACTANTES"),
          new Table({
            layout: TableLayoutType.FIXED,
            borders: NO_BORDERS,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({
              children: [
                partyCell("PRESTATAIRE", [
                  ["Société", "Global Solutions Entreprise (GSE)"],
                  ["Agrément", "N° APA-26-025/CNGP-BEN"],
                  ["RCCM", "RB/COT/24 B 38910"],
                  ["IFU", "3202420126111"],
                  ["Adresse", "Ilot 3535, Cotonou, Bénin"],
                  ["Téléphone", "+229 53 04 79 50"],
                  ["Email", "contact@phyto-benin.com"],
                ]),
                partyCell("CLIENT", [
                  ["Dénomination", entreprise],
                  ["Représentant", nomClient],
                  ["Adresse", client.adresse || "Cotonou, Bénin"],
                  ["Téléphone", client.telephone || "_______________"],
                  ["Type d'établissement", "Boulangerie — production alimentaire"],
                  ["Superficie", devis.superficie ? devis.superficie + " m²" : "_______________"],
                ]),
              ]
            })]
          }),

          // ── ART 2 ─ OBJET ──
          secTitle("ARTICLE 2 — OBJET DU CONTRAT"),
          para(new TextRun({ text: "Le présent contrat a pour objet la réalisation par GSE d'un programme annuel d'entretien sanitaire conformément aux recommandations du rapport de visite technique et dans le respect de la loi 91-004 du 11 Février 1991 portant réglementation Phytosanitaire en République du Bénin.", size: 19 })),
          para([
            new TextRun({ text: "Note : ", bold: true, size: 19, color: VERT }),
            new TextRun({ text: `L'intervention initiale (devis ${devis.numero}) est facturée séparément à ${montant} FCFA et doit être réglée avant démarrage du présent contrat.`, size: 19, italics: true })
          ], { before: 0, after: 60 }),

          // ── ART 3 ─ PRESTATIONS ──
          secTitle(`ARTICLE 3 — PRESTATIONS INCLUSES (${formule})`),
          new Table({
            layout: TableLayoutType.FIXED,
            borders: GRID_BORDERS,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header
              new TableRow({
                tableHeader: true,
                children: ["Fréquence", "Nature de l'intervention", "Détail"].map(h =>
                  new TableCell({
                    shading: shading(VERT),
                    margins: { top: mm(2), bottom: mm(2), left: mm(3), right: mm(3) },
                    children: [para(new TextRun({ text: h, bold: true, size: 18, color: OR }), { align: AlignmentType.CENTER, before: 60, after: 60 })]
                  })
                )
              }),
              servRow(
                `× ${passages} / an\n(trimestrielle)`,
                "Désinsectisation +\nDératisation complètes",
                [
                  "— Traitement insecticide rémanent : murs, plinthes, zones d'ombre",
                  "— Dératisation : vérification et rechargement des stations",
                  "— Inspection visuelle complète",
                  "— Fiche de passage + Attestation GSE à chaque intervention"
                ],
                BEIGE2
              ),
              ...(controles > 0 ? [servRow(
                `× ${controles} / an\n(mensuelle inter-trim.)`,
                "Contrôle des stations\nà rongeurs",
                [
                  "— Vérification état et consommation des appâts",
                  "— Rechargement si nécessaire",
                  "— Rapport succinct transmis au Client"
                ]
              )] : []),
              servRow(
                "× 1 / an\n(fin de contrat)",
                "Audit de conformité\nsanitaire annuel",
                [
                  "— Bilan complet du plan IPM sur 12 mois",
                  "— Rapport écrit utilisable lors de contrôles sanitaires officiels"
                ],
                BEIGE2
              ),
            ]
          }),

          spacer(80),

          // ── ART 4 ─ FINANCES ──
          secTitle("ARTICLE 4 — CONDITIONS FINANCIÈRES"),
          new Table({
            layout: TableLayoutType.FIXED,
            borders: GRID_BORDERS,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              finRow("Désignation", "Montant", true),
              finRow(`Prix de référence — ${passages} passages ponctuels`, prixRef.toLocaleString("fr-FR") + " FCFA", false, BEIGE),
              finRow(`Remise contrat annuel (${remisePct} %)`, "− " + (prixRef - prixAnnuel).toLocaleString("fr-FR") + " FCFA"),
              finRow("MONTANT ANNUEL DU CONTRAT (TTC)", prixAnnuel.toLocaleString("fr-FR") + " FCFA", true),
              finRow("Paiement trimestriel en avance", prixTrim.toLocaleString("fr-FR") + " FCFA / trimestre", false, BEIGE),
            ]
          }),
          spacer(40),
          para(new TextRun({ text: `* L'intervention initiale ${devis.numero} (${montant} FCFA) est facturée séparément.`, size: 17, italics: true, color: GRIS }), { before: 0, after: 80 }),

          // ── ART 5 ─ PAIEMENT ──
          secTitle("ARTICLE 5 — MODALITÉS DE PAIEMENT"),
          bullet("Le paiement s'effectue par trimestre, en avance, avant tout passage trimestriel."),
          bullet("Aucune prestation ne sera réalisée en l'absence de règlement du trimestre correspondant."),
          bullet("Les contrôles mensuels intermédiaires sont inclus dans le forfait trimestriel."),
          bullet("Modes acceptés : espèces, Mobile Money (MTN / Moov), virement bancaire."),
          bullet("Tout retard de paiement supérieur à 15 jours suspend l'exécution du contrat."),

          // ── ART 6 ─ DURÉE ──
          secTitle("ARTICLE 6 — DURÉE ET RENOUVELLEMENT"),
          bullet(`Le contrat est conclu pour une durée de ${duree} mois à compter de la date de signature.`),
          bullet(`À l'échéance, il est reconduit tacitement pour une nouvelle période de ${duree} mois, sauf dénonciation.`),
          bullet("La date du premier passage sera fixée d'un commun accord dans les 30 jours suivant la signature."),

          // ── ART 7 ─ RÉSILIATION ──
          secTitle("ARTICLE 7 — RÉSILIATION"),
          bullet("Chaque partie peut résilier le contrat avec un préavis écrit d'un trimestre complet."),
          bullet("Toute résiliation en cours de trimestre ne donne droit à aucun remboursement."),
          bullet("En cas de résiliation anticipée du Client, les trimestres restants sont dus à GSE."),
          bullet("GSE peut résilier sans préavis en cas de non-paiement ou d'impossibilité d'accès répétée."),

          // ── ART 8 ─ OBLIGATIONS ──
          secTitle("ARTICLE 8 — OBLIGATIONS DES PARTIES"),
          para(new TextRun({ text: "8.1  Obligations de GSE", bold: true, size: 20, color: VERT }), { before: 80, after: 40 }),
          bullet("Réaliser les interventions aux dates convenues par des techniciens certifiés."),
          bullet("Utiliser exclusivement des produits homologués par l'État du Bénin."),
          bullet("Remettre une fiche de passage + attestation après chaque intervention trimestrielle."),
          bullet("Transmettre le rapport d'audit annuel au plus tard 15 jours après la dernière intervention."),
          para(new TextRun({ text: "8.2  Obligations du Client", bold: true, size: 20, color: VERT }), { before: 80, after: 40 }),
          bullet("Garantir l'accès libre au site dans les 72h suivant la notification de passage par GSE."),
          bullet("Tout refus d'accès injustifié est décompté comme passage effectué."),
          bullet("Mettre en œuvre les recommandations d'hygiène émises par GSE."),
          bullet("Informer GSE de tout changement affectant le site."),

          // ── ART 9 ─ RESPONSABILITÉ ──
          secTitle("ARTICLE 9 — LIMITATION DE RESPONSABILITÉ"),
          para(new TextRun({ text: "GSE ne saurait être tenu responsable des recontaminations résultant du non-respect par le Client des recommandations d'hygiène transmises. Le rapport de visite technique GSE fait foi en cas de litige.", size: 19 })),

          // ── ART 10 ─ RÉVISION ──
          secTitle("ARTICLE 10 — RÉVISION TARIFAIRE"),
          para(new TextRun({ text: "Le tarif annuel peut être révisé à chaque renouvellement sur notification écrite 30 jours avant l'échéance.", size: 19 }), { after: 80 }),

          spacer(120),

          // ── SIGNATURES ──
          new Table({
            layout: TableLayoutType.FIXED,
            borders: NO_BORDERS,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({
              children: [
                new TableCell({
                  shading: shading(BEIGE),
                  borders: NO_BORDERS,
                  margins: { top: mm(4), bottom: mm(4), left: mm(5), right: mm(5) },
                  children: [
                    para(new TextRun({ text: "Pour GSE", bold: true, size: 20, color: VERT }), { align: AlignmentType.CENTER, before: 80, after: 60 }),
                    para(new TextRun({ text: "Global Solutions Entreprise", size: 17, italics: true, color: GRIS }), { align: AlignmentType.CENTER, before: 20, after: 0 }),
                    para(new TextRun({ text: "Cachet et signature", size: 17, italics: true, color: GRIS }), { align: AlignmentType.CENTER, before: 0, after: 200 }),
                    para(new TextRun({ text: "_".repeat(36), size: 18 }), { align: AlignmentType.CENTER, before: 0, after: 60 }),
                    para(new TextRun({ text: "À Cotonou, le ___ / ___ / 2026", size: 17, color: GRIS }), { align: AlignmentType.CENTER, before: 0, after: 80 }),
                  ]
                }),
                new TableCell({
                  shading: shading(BEIGE),
                  borders: NO_BORDERS,
                  margins: { top: mm(4), bottom: mm(4), left: mm(5), right: mm(5) },
                  children: [
                    para(new TextRun({ text: "Pour le Client", bold: true, size: 20, color: VERT }), { align: AlignmentType.CENTER, before: 80, after: 60 }),
                    para(new TextRun({ text: entreprise, size: 17, italics: true, color: GRIS }), { align: AlignmentType.CENTER, before: 20, after: 0 }),
                    para(new TextRun({ text: "Bon pour accord — Signature", size: 17, italics: true, color: GRIS }), { align: AlignmentType.CENTER, before: 0, after: 200 }),
                    para(new TextRun({ text: "_".repeat(36), size: 18 }), { align: AlignmentType.CENTER, before: 0, after: 60 }),
                    para(new TextRun({ text: "À Cotonou, le ___ / ___ / 2026", size: 17, color: GRIS }), { align: AlignmentType.CENTER, before: 0, after: 80 }),
                  ]
                })
              ]
            })]
          }),

          spacer(100),

          // ── PIED DE PAGE ──
          new Table({
            layout: TableLayoutType.FIXED,
            borders: NO_BORDERS,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({
              children: [new TableCell({
                shading: shading(VERT),
                borders: NO_BORDERS,
                margins: { top: mm(3), bottom: mm(3), left: mm(4), right: mm(4) },
                children: [para(new TextRun({ text: "Global Solutions Entreprise  ·  Cotonou, Bénin  ·  contact@phyto-benin.com  ·  +229 53 04 79 50", size: 16, color: OR }), { align: AlignmentType.CENTER, before: 80, after: 80 })]
              })]
            })]
          }),

        ]
      }]
    })

    const buffer = await Packer.toBuffer(doc)

    const nomFichier = `GSE_Contrat_${(client.nom || "client").replace(/\s+/g, "_")}_${new Date().getFullYear()}.docx`
      .replace(/[^a-zA-Z0-9_.-]/g, "")

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${nomFichier}"`,
      }
    })

  } catch (err) {
    console.error("generate-contract error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
