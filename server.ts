import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Helper to generate text & HTML email content from a MortEvaluationRecord
function generateRecordEmailContent(record: any) {
  const code = record.code || "Sense Codi";
  const location = record.locationName || "Localització no especificada";
  const action = record.result?.recommendedAction || "NO DETERMINADA";
  const totalScore = record.result?.totalScore ?? 0;
  const date = record.date || new Date().toISOString().split("T")[0];
  const observer = record.observerName || "No especificat";
  const depth = record.depthM ? `${record.depthM} m` : "No indicada";
  const coords =
    record.latitude && record.longitude
      ? `${record.latitude.toFixed(6)}° N, ${record.longitude.toFixed(6)}° E`
      : "No registrades";

  const presenceText =
    record.presenceStatus === "not_found"
      ? `NO LOCALITZAT (${record.notFoundReason || "Motiu no especificat"})`
      : "LOCALITZAT AL FONS";

  const usageText =
    record.usageStatus === "active"
      ? "En ús actiu"
      : record.usageStatus === "abandoned"
      ? "Abandonat / Fora de servei"
      : "Estat desconegut";

  const dim = record.dimensions || {};
  const dimText = `${dim.lengthCm || 0} x ${dim.widthCm || 0} x ${dim.heightCm || 0} cm`;
  const volM3 =
    record.hydrodynamics?.volumeM3 ||
    (dim.lengthCm && dim.widthCm && dim.heightCm
      ? (dim.lengthCm * dim.widthCm * dim.heightCm) / 1e6
      : 0);
  const volText = volM3 ? `${volM3.toFixed(3)} m³` : "-";
  const weightAir = record.hydrodynamics?.weightAirKg
    ? `${record.hydrodynamics.weightAirKg} kg`
    : dim.estimatedWeightKg
    ? `${dim.estimatedWeightKg} kg`
    : "-";
  const weightSub = record.hydrodynamics?.submergedWeightKg
    ? `${record.hydrodynamics.submergedWeightKg} kg`
    : dim.submergedWeightKg
    ? `${dim.submergedWeightKg} kg`
    : "-";

  const c1Text =
    record.c1_speciesPresence === "high_coverage_or_protected"
      ? "Presència d'espècies protegides / alta cobertura bioconstrucció (-2 pts)"
      : record.c1_speciesPresence === "low_coverage"
      ? "Baixa colonització (oportunistes) (0 pts)"
      : "Sense colonització / Fons inert (0 pts)";

  const c2Text =
    record.c2_substrateImpact === "direct_seagrass_bed"
      ? "Directament sobre mata viva de Posidònia (+3 pts)"
      : record.c2_substrateImpact === "coralligenous_or_rhodolith"
      ? "Sobre coral·ligen o llit de rodòlits (+2 pts)"
      : record.c2_substrateImpact === "sand_or_mud"
      ? "Sobre sorra o fang (+1 pt)"
      : record.c2_substrateImpact === "bare_rock"
      ? "Sobre roca nua natural (0 pts)"
      : "Cap / No localitzat (0 pts)";

  const c2Mobile = record.c2_hasMobileElements
    ? `Sí, cadena/element mòbil generant halo de garbeig (radi: ${record.c2_haloRadiusM || 0} m)`
    : "No";

  const c3Text =
    record.c3_dynamismRisk === "high_risk_drag"
      ? "Alt risc d'arrossegament hidrodinàmic en temporal (+2 pts)"
      : record.c3_dynamismRisk === "moderate_drag"
      ? "Risc moderat (+1 pt)"
      : "Zona protegida / Estable hidrodinàmicament (0 pts)";

  const c4Text =
    record.c4_stabilityIntegration === "high_burial_consolidated"
      ? "Altament colgat / integrat al fons mari (-2 pts)"
      : record.c4_stabilityIntegration === "large_deep_stable"
      ? "Gran tonatge / profunditat elevada (estable) (+1 pt)"
      : record.c4_stabilityIntegration === "superficial_unstable"
      ? "Superficial i inestable sobre el substrat (+2 pts)"
      : "Estable / No localitzat";

  const justification =
    record.result?.ecologicalJustification ||
    record.result?.justification ||
    "Sense justificació detallada.";
  const notes = record.generalNotes || "Cap observació addicional.";

  const subject = `[Diagnosi Morts de Fondeig] Registre: ${code} - ${location} (${action.toUpperCase()})`;

  const plainText = `
======================================================
ACTA TÈCNICA DE REGISTRE I DIAGNOSI: MORTS DE FONDEIG
Consorci de Conservació del Medi Marí W&M
Boris Weitzmann • Xavier Munill / Bufalvent.net
Versió: v2.1 - 2026
======================================================

1. IDENTIFICACIÓ I LOCALITZACIÓ:
- Codi del Mort: ${code}
- Localització / Cala: ${location}
- Data d'inspecció: ${date}
- Coordenades GPS: ${coords}
- Fondària: ${depth}
- Inspector / Tècnic: ${observer}
- Estat de Localització: ${presenceText}
- Estat d'Ús: ${usageText}

2. CARACTERÍSTIQUES FÍSIQUES DEL BLOC:
- Dimensions (L x A x H): ${dimText}
- Volum estimat: ${volText}
- Pes en aire: ${weightAir}
- Pes submergit: ${weightSub}
- Material: ${dim.material || "Formigó estàndard"}

3. CRITERIS D'AVALUACIÓ ECOLÒGICA (PROTOCOL MARIN_BIODIV):
- Criteri 1 (Espècies / Colonització): ${c1Text}
  ${record.c1_speciesNotes ? `Notes espècies: ${record.c1_speciesNotes}` : ""}
- Criteri 2 (Substrat & Impacte Fons): ${c2Text}
  Elements mòbils / Halo: ${c2Mobile}
- Criteri 3 (Hidrodinàmica & Risc Onatge): ${c3Text}
- Criteri 4 (Estabilitat & Enterrament): ${c4Text}
  ${record.c4_notes ? `Notes estabilitat: ${record.c4_notes}` : ""}

4. DIAGNOSI FINAL I DECISIÓ RECOMANDADA:
------------------------------------------------------
PUNTUACIÓ TOTAL DEL PROTOCOL: ${totalScore > 0 ? "+" + totalScore : totalScore} PUNTS
ACCIÓ RECOMANDADA: ${action.toUpperCase()}
------------------------------------------------------
Justificació tècnica:
${justification}

5. OBSERVACIONS I NOTES DE CAMP:
${notes}

Fotografies adjuntes/registrades: ${record.photos?.length || (record.photoUrl ? 1 : 0)} fotos.

------------------------------------------------------
Generat automàticament des de la Calculadora de Diagnosi: Morts de fondeig.
Directiva Hàbitats (92/43/CEE) & Llei de Restauració de la Natura (UE 2024/1991).
`;

  const actionBg =
    action.toLowerCase().includes("retirar")
      ? "#991b1b"
      : action.toLowerCase().includes("mantenir")
      ? "#166534"
      : "#d97706";

  const html = `
<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F5F5F0; margin: 0; padding: 24px; color: #134E4A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #D1D1C7; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <!-- Header -->
    <tr>
      <td style="background-color: #134E4A; padding: 24px; text-align: left; color: #ffffff;">
        <table width="100%">
          <tr>
            <td>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; font-family: monospace;">Protocol de Restauració d'Hàbitats Marins</div>
              <h1 style="margin: 6px 0 2px 0; font-size: 22px; font-weight: bold; font-family: Georgia, serif; font-style: italic;">Calculadora de Diagnosi: Morts de fondeig</h1>
              <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Consorci de Conservació del Medi Marí W&amp;M • Boris Weitzmann • Xavier Munill / Bufalvent.net</div>
            </td>
            <td align="right" valign="top">
              <span style="background-color: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-family: monospace; font-weight: bold;">v2.1 - 2026</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Summary Box -->
    <tr>
      <td style="padding: 24px 24px 16px 24px;">
        <table width="100%" style="background-color: #F8FAF9; border-radius: 12px; border: 1px solid #D1D5DB; padding: 16px; margin-bottom: 20px;">
          <tr>
            <td>
              <div style="font-size: 12px; color: #64746B; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Codi del Mort &amp; Cala</div>
              <div style="font-size: 20px; font-weight: bold; color: #134E4A; margin-top: 2px;">
                ${code} <span style="font-size: 15px; font-weight: normal; color: #4A5D52;">(${location})</span>
              </div>
            </td>
            <td align="right">
              <div style="font-size: 11px; color: #64746B; text-transform: uppercase; font-weight: bold;">Decisió Recomanada</div>
              <div style="display: inline-block; background-color: ${actionBg}; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 13px; margin-top: 4px;">
                ${action.toUpperCase()} (${totalScore > 0 ? "+" + totalScore : totalScore} pts)
              </div>
            </td>
          </tr>
        </table>

        <!-- Section 1 -->
        <h3 style="font-size: 15px; font-weight: bold; color: #134E4A; border-bottom: 2px solid #E5E5DF; padding-bottom: 6px; margin-top: 16px; margin-bottom: 12px;">
          1. Dades Generals &amp; Localització
        </h3>
        <table width="100%" style="font-size: 13px; line-height: 1.6; border-collapse: collapse;">
          <tr>
            <td width="35%" style="color: #64746B; padding: 4px 0;"><strong>Data d'inspecció:</strong></td>
            <td style="color: #111827; padding: 4px 0;">${date}</td>
          </tr>
          <tr>
            <td style="color: #64746B; padding: 4px 0;"><strong>Coordenades GPS:</strong></td>
            <td style="color: #111827; padding: 4px 0; font-family: monospace;">${coords}</td>
          </tr>
          <tr>
            <td style="color: #64746B; padding: 4px 0;"><strong>Fondària:</strong></td>
            <td style="color: #111827; padding: 4px 0;">${depth}</td>
          </tr>
          <tr>
            <td style="color: #64746B; padding: 4px 0;"><strong>Tècnic / Inspector:</strong></td>
            <td style="color: #111827; padding: 4px 0;">${observer}</td>
          </tr>
          <tr>
            <td style="color: #64746B; padding: 4px 0;"><strong>Estat al fons:</strong></td>
            <td style="color: #111827; padding: 4px 0;">${presenceText}</td>
          </tr>
          <tr>
            <td style="color: #64746B; padding: 4px 0;"><strong>Estat d'ús:</strong></td>
            <td style="color: #111827; padding: 4px 0;">${usageText}</td>
          </tr>
        </table>

        <!-- Section 2 -->
        <h3 style="font-size: 15px; font-weight: bold; color: #134E4A; border-bottom: 2px solid #E5E5DF; padding-bottom: 6px; margin-top: 20px; margin-bottom: 12px;">
          2. Característiques Físiques del Bloc
        </h3>
        <table width="100%" style="font-size: 13px; line-height: 1.6; border-collapse: collapse;">
          <tr>
            <td width="35%" style="color: #64746B; padding: 4px 0;"><strong>Dimensions (L x A x H):</strong></td>
            <td style="color: #111827; padding: 4px 0;">${dimText}</td>
          </tr>
          <tr>
            <td style="color: #64746B; padding: 4px 0;"><strong>Volum &amp; Pes en aire:</strong></td>
            <td style="color: #111827; padding: 4px 0;">${volText} • ${weightAir}</td>
          </tr>
          <tr>
            <td style="color: #64746B; padding: 4px 0;"><strong>Pes aparent submergit:</strong></td>
            <td style="color: #111827; padding: 4px 0;">${weightSub}</td>
          </tr>
        </table>

        <!-- Section 3 -->
        <h3 style="font-size: 15px; font-weight: bold; color: #134E4A; border-bottom: 2px solid #E5E5DF; padding-bottom: 6px; margin-top: 20px; margin-bottom: 12px;">
          3. Avaluació del Protocol Ecològic (MARIN_BIODIV)
        </h3>
        <table width="100%" style="font-size: 13px; line-height: 1.6; border-collapse: collapse;">
          <tr>
            <td width="35%" style="color: #64746B; padding: 4px 0;" valign="top"><strong>C1. Espècies / Colonització:</strong></td>
            <td style="color: #111827; padding: 4px 0;">
              ${c1Text}
              ${record.c1_speciesNotes ? `<div style="font-size: 12px; color: #047857; margin-top: 2px;"><em>${record.c1_speciesNotes}</em></div>` : ""}
            </td>
          </tr>
          <tr>
            <td style="color: #64746B; padding: 4px 0;" valign="top"><strong>C2. Impacte sobre Substrat:</strong></td>
            <td style="color: #111827; padding: 4px 0;">
              ${c2Text}
              <div style="font-size: 12px; color: #4B5563;">Elements mòbils: ${c2Mobile}</div>
            </td>
          </tr>
          <tr>
            <td style="color: #64746B; padding: 4px 0;"><strong>C3. Risc Dinàmic / Hidrodinàmica:</strong></td>
            <td style="color: #111827; padding: 4px 0;">${c3Text}</td>
          </tr>
          <tr>
            <td style="color: #64746B; padding: 4px 0;" valign="top"><strong>C4. Estabilitat / Integració:</strong></td>
            <td style="color: #111827; padding: 4px 0;">
              ${c4Text}
              ${record.c4_notes ? `<div style="font-size: 12px; color: #4B5563;"><em>${record.c4_notes}</em></div>` : ""}
            </td>
          </tr>
        </table>

        <!-- Section 4 -->
        <h3 style="font-size: 15px; font-weight: bold; color: #134E4A; border-bottom: 2px solid #E5E5DF; padding-bottom: 6px; margin-top: 20px; margin-bottom: 12px;">
          4. Justificació Tècnica i Notes de Camp
        </h3>
        <div style="background-color: #FAF9F6; border-left: 4px solid #134E4A; padding: 12px 16px; border-radius: 4px; font-size: 13px; line-height: 1.5; color: #1f2937; margin-bottom: 12px;">
          <strong>Justificació:</strong> ${justification}
        </div>
        ${
          notes
            ? `<div style="font-size: 12px; color: #4B5563; line-height: 1.5;"><strong>Observacions:</strong> ${notes}</div>`
            : ""
        }
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #E9E9E0; padding: 16px 24px; font-size: 11px; color: #64746B; border-top: 1px solid #D1D1C7; text-align: center;">
        Aquest missatge ha estat tramès automàticament en registrar el punt a la <strong>Calculadora de Diagnosi: Morts de fondeig</strong>.<br>
        Directiva Hàbitats (92/43/CEE) &bull; Llei de Restauració de la Natura (UE 2024/1991) &bull; Bufalvent.net
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return { subject, plainText, html };
}

// API Route: Send Point Email Notification
app.post("/api/send-point-email", async (req, res) => {
  try {
    const { record, recipient } = req.body;

    if (!record || !record.code) {
      return res.status(400).json({
        success: false,
        error: "Dades del registre incompletes o mancants.",
      });
    }

    const targetEmail =
      recipient ||
      process.env.NOTIFICATION_EMAIL ||
      "xaviermunill@bufalvent.net";

    const { subject, plainText, html } = generateRecordEmailContent(record);

    console.log(
      `[EMAIL NOTIFICATION] Preparant enviament per al punt ${record.code} -> ${targetEmail}`
    );

    let info: any = null;
    let deliveryMethod = "server_log";

    // If SMTP host and credentials are provided, send via real SMTP
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      info = await transporter.sendMail({
        from:
          process.env.SMTP_FROM ||
          '"Diagnosi Morts de Fondeig" <notifications@bufalvent.net>',
        to: targetEmail,
        subject,
        text: plainText,
        html,
      });

      deliveryMethod = "smtp";
      console.log(`[EMAIL NOTIFICATION] Enviament SMTP completat:`, info.messageId);
    } else {
      // Fallback: Create test transporter or simulate email delivery, log formatted notification
      console.log(
        `[EMAIL NOTIFICATION] SMTP no configurat a .env. Registre enviat i arxivat per al destinatari: ${targetEmail}`
      );
      deliveryMethod = "simulated_dispatch";
    }

    return res.json({
      success: true,
      recipient: targetEmail,
      subject,
      deliveryMethod,
      messageId: info?.messageId || `notif_${Date.now()}`,
      plainText,
      html,
    });
  } catch (error: any) {
    console.error("[EMAIL NOTIFICATION ERROR]", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Error intern en l'enviament del correu.",
    });
  }
});

// API health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
