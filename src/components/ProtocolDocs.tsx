import React from 'react';
import {
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Waves,
  Anchor,
  TreeDeciduous,
  CheckCircle2,
  FileText,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { PROTECTED_SPECIES_CATALOG } from '../data/protocolStandards';

export const ProtocolDocs: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16">
      
      {/* Intro Header */}
      <div className="bg-[#134E4A] text-[#F5F5F0] rounded-3xl p-6 sm:p-10 shadow-lg border border-[#0E3B38] space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9E9E0]/20 text-[#E9E9E0] text-xs font-semibold uppercase tracking-wider border border-[#E9E9E0]/30">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Fonamentació Ecològica i Marc Tècnic</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-[#FAF9F6]">
          Protocol de Priorització per a la Retirada de Blocs de Formigó (Morts)
        </h1>
        <p className="text-[#D1D1C7] text-sm sm:text-base leading-relaxed max-w-3xl font-sans">
          Definició de criteris de diagnosi objectiva per a la restauració d'hàbitats marins costaners, superant les normatives generalistes de retirada indiscriminada i prioritzant l'estabilitat ecològica i la conservació de la biodiversitat.
        </p>
      </div>

      {/* 1. Context i Filosofia del Protocol */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D1D1C7] space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#134E4A] flex items-center gap-2 border-b border-[#E9E9E0] pb-4">
          <Scale className="w-5 h-5 text-[#3D5A45]" />
          1. Context i Enfocament Ambiental
        </h2>
        <div className="prose text-[#134E4A] text-xs sm:text-sm space-y-3 leading-relaxed">
          <p>
            És fonamental definir un <strong>protocol de diagnosi i criteris d'avaluació clars</strong> per avaluar d'una forma objectiva cadascuna de les estructures submergides i sistemes de fondeig. Aquest mètode transcendeix les normatives generalistes que sovint recomanen la retirada indiscriminada de qualsevol tipus d'estructura artificial fondejada, i es centra en l'<strong>impacte real que generen</strong> i en la <strong>conservació de les espècies i hàbitats amenaçats</strong>.
          </p>
          <p>
            En un context d'emergència climàtica, on els hàbitats costaners ja estan sotmesos a un estrès sever (escalfament de l'aigua, temporals més freqüents i violents, pressió antròpica), tota intervenció humana —fins i tot la de restauració— pot comportar riscos afegits. L'objectiu no és només "netejar el fons", sinó <strong>evitar la generació de noves amenaces o inestabilitats</strong> que els ecosistemes debilitats no tindrien capacitat d'encabir ni superar.
          </p>
          <div className="p-4 bg-[#E9E9E0]/70 rounded-2xl border border-[#D1D1C7] text-[#134E4A] font-medium">
            Es prioritza l'estabilitat i la resiliència de l'hàbitat per sobre d'accions sistemàtiques que, sota la pretensió de neteja, podrien acabar comprometent encara més la integritat del fons marí (resuspensió de sediments fins, obertura de noves calves, proliferació d'espècies invasores com <em>Caulerpa cylindracea</em>, o destrucció de comunitats d'algues protegides).
          </div>
        </div>
      </div>

      {/* 2. Els 4 Criteris d'Avaluació */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D1D1C7] space-y-6">
        <h2 className="text-xl font-serif font-bold text-[#134E4A] flex items-center gap-2 border-b border-[#E9E9E0] pb-4">
          <FileText className="w-5 h-5 text-[#3D5A45]" />
          2. Metodologia de Puntuació i Criteris Fonamentals
        </h2>

        <div className="grid grid-cols-1 gap-6">
          
          {/* Criteri 1 */}
          <div className="p-6 rounded-3xl bg-[#EBF3ED] border border-[#C5DDCB] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-[#1A4526] flex items-center gap-2 text-sm sm:text-base">
                <TreeDeciduous className="w-4 h-4 text-[#2D5A3C]" />
                Criteri 1: Protecció d'espècies amenaçades o hàbitats protegits (-10 a 0 punts)
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-[#2D5A3C] text-white">
                Fins a -10 punts
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#1A4526] leading-relaxed">
              <strong>Justificació ecològica:</strong> Tot i ser una estructura artificial, la seva colonització per espècies de creixement lent (com <em>Cystoseira spp.</em> / algues fucals o comunitats de coral·ligen) transforma el bloc en un element d'alta biodiversitat. La retirada destruiria aquestes colònies protegides per la Directiva Hàbitats (92/43/CEE), Conveni de Berna i el Manual del grau d'amenaça i interès de conservació dels hàbitats de Catalunya (Ballesteros et al., Gencat).
            </p>
            <ul className="text-xs text-[#1A4526] list-disc list-inside space-y-1.5 pt-1">
              <li><strong>Cobertura &gt;10% o exemplars reproductors d'espècies protegides:</strong> -10 punts</li>
              <li><strong>Presència d'espècies amenaçades en densitats &lt;10%:</strong> -7 punts</li>
              <li><strong>Recobriment algal general o organismes renaturalitzats:</strong> -5 punts</li>
              <li><strong>Absència d'espècies protegides/d'interès:</strong> 0 punts</li>
            </ul>
          </div>

          {/* Criteri 2 */}
          <div className="p-6 rounded-3xl bg-[#FBF0EE] border border-[#EDC5C0] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-[#6B221D] flex items-center gap-2 text-sm sm:text-base">
                <Anchor className="w-4 h-4 text-[#8B322C]" />
                Criteri 2: Impacte sobre el substrat annex (+5 a 0 punts)
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-[#8B322C] text-white">
                +5 punts
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#6B221D] leading-relaxed">
              <strong>Justificació ecològica:</strong> Els blocs inestables o amb trens de fondeig mal instal·lats generen un efecte d'abrasió per cadena (garreig). El fregament mecànic trenca rizomes de <em>Posidonia oceanica</em> i impedeix que la praderia tanqui les clarianes, creant halos desvegetats que actuen com a punts calents d'erosió.
            </p>
            <ul className="text-xs text-[#6B221D] list-disc list-inside space-y-1.5 pt-1">
              <li><strong>Existeix ferida o calva activa a la praderia (halo) o elements mòbils:</strong> +5 punts</li>
              <li><strong>Absència d'abrasió o elements mòbils lesius:</strong> 0 punts</li>
            </ul>
          </div>

          {/* Criteri 3 */}
          <div className="p-6 rounded-3xl bg-[#EAF0F4] border border-[#BFD4E2] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-[#133E59] flex items-center gap-2 text-sm sm:text-base">
                <Waves className="w-4 h-4 text-[#204E6B]" />
                Criteri 3: Dinamisme i Risc — Tamany i Fondària (+3 a 0 punts)
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-[#204E6B] text-white">
                +3 punts
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#133E59] leading-relaxed">
              <strong>Justificació ecològica i física:</strong> Blocs de pes reduït (&lt;500 kg en aire / &lt;100 kg alt risc) en zones someres (&lt;15 m) estan sotmesos a elevades velocitats orbitals de fons (u_b) durant temporals hivernals (períodes T = 8 s a 10 s), afavorint el seu lliscament aleatori per sobre del fons i l'ampliació del radi de dany.
            </p>
            <ul className="text-xs text-[#133E59] list-disc list-inside space-y-1.5 pt-1">
              <li><strong>Mort petit en zona somera amb risc de lliscament:</strong> +3 punts</li>
              <li><strong>Absència de risc de desplaçament per fondària o gran inèrcia:</strong> 0 punts</li>
            </ul>
          </div>

          {/* Criteri 4 */}
          <div className="p-6 rounded-3xl bg-[#FAF9F6] border border-[#D1D1C7] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-[#134E4A] flex items-center gap-2 text-sm sm:text-base">
                <Scale className="w-4 h-4 text-[#3D5A45]" />
                Criteri 4: Estabilitat i Integració en l'hàbitat (-5 a +5 punts)
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-[#134E4A] text-white">
                -5 a +5 punts
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#134E4A] leading-relaxed">
              <strong>Justificació ecològica:</strong> Blocs enterrats o consolidats on el rizoma de posidònia ha crescut en contacte directe o cobrint-lo. L'extracció obriria una ferida a la mata que podria derivar en marmites d'erosió o colonització per espècies invasores.
            </p>
            <ul className="text-xs text-[#134E4A] list-disc list-inside space-y-1.5 pt-1">
              <li><strong>Fixat pel sediment o arrels/rizoma adherit:</strong> -5 punts</li>
              <li><strong>No enterrat, però la seva retirada SÍ generaria un buit nou perjudicial:</strong> -5 punts</li>
              <li><strong>No enterrat, no toca rizoma, i la retirada NO genera buit perjudicial:</strong> +5 punts</li>
              <li><strong>Bloc gran o profund integrat de forma estable:</strong> +1 punt</li>
            </ul>
          </div>

        </div>
      </div>

      {/* 3. Matriu de Presa de Decisions */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D1D1C7] space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#134E4A] flex items-center gap-2 border-b border-[#E9E9E0] pb-4">
          <CheckCircle2 className="w-5 h-5 text-[#3D5A45]" />
          3. Matriu Oficial de Presa de Decisions
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border border-[#D1D1C7] rounded-2xl overflow-hidden">
            <thead className="bg-[#E9E9E0] text-[#134E4A] font-serif font-bold uppercase text-xs tracking-wider">
              <tr>
                <th className="p-3.5">Puntuació Final</th>
                <th className="p-3.5">Classificació</th>
                <th className="p-3.5">Acció Recomanada</th>
                <th className="p-3.5">Mesura de Mitigació i Criteri Operatiu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9E9E0]">
              <tr className="bg-[#FBF0EE]/60">
                <td className="p-3.5 font-mono font-bold text-[#8B322C]">≥ +10 punts</td>
                <td className="p-3.5 font-serif font-bold text-[#6B221D]">Prioritat Alta</td>
                <td className="p-3.5 font-extrabold text-[#8B322C]">RETIRADA IMMEDIATA</td>
                <td className="p-3.5 text-[#134E4A]">
                  Estratègic extreure'ls immediatament: generen dany actiu sobre el substrat (halo d'erosió / garreig de cadenes), presenten risc alt de mobilitat hidrodinàmica i no aporten valor ecològic ni colonització protegida. Retirada completa de bloc i cadenes.
                </td>
              </tr>
              <tr className="bg-[#F8F3E8]/60">
                <td className="p-3.5 font-mono font-bold text-[#7D5B18]">+5 a +9 punts</td>
                <td className="p-3.5 font-serif font-bold text-[#5F430E]">Prioritat Mitjana</td>
                <td className="p-3.5 font-extrabold text-[#7D5B18]">RETIRADA PROGRAMADA</td>
                <td className="p-3.5 text-[#134E4A]">
                  Convé la seva retirada en segones fases d'actuació. Presenta impacte moderat o risc de mobilitat. Mesura de mitigació: afegir boies de suspensió a la cadena per evitar el garreig sobre el fons marí fins a la seva retirada programada.
                </td>
              </tr>
              <tr className="bg-[#EAF0F4]/60">
                <td className="p-3.5 font-mono font-bold text-[#204E6B]">+1 a +4 punts</td>
                <td className="p-3.5 font-serif font-bold text-[#133E59]">Prioritat Baixa</td>
                <td className="p-3.5 font-extrabold text-[#204E6B]">PRIORITAT BAIXA (Mitigació)</td>
                <td className="p-3.5 text-[#134E4A]">
                  Cal avaluar si l'impacte de l'extracció mecànica compensa el petit benefici ambiental. Acció correctora: desconnectar i tallar els elements mòbils residuals arran de bloc; mantenir el bloc in situ si està estabilitzat.
                </td>
              </tr>
              <tr className="bg-[#EBF3ED]/60">
                <td className="p-3.5 font-mono font-bold text-[#2D5A3C]">≤ 0 punts</td>
                <td className="p-3.5 font-serif font-bold text-[#1A4526]">No retirar (Conservar)</td>
                <td className="p-3.5 font-extrabold text-[#2D5A3C]">NO RETIRAR (CONSERVAR)</td>
                <td className="p-3.5 text-[#134E4A]">
                  El bloc actua com a refugi de biodiversitat (colonització per Cystoseira, coral·ligen, Lithophyllum o integració en mata de Posidonia/Cymodocea) o la seva extracció causaria més dany al medi que la seva permanència. Tall net d'elements mòbils sense traccionar el bloc.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Catàleg d'Espècies i Comunitats Clau */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D1D1C7] space-y-4">
        <div className="border-b border-[#E9E9E0] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-xl font-serif font-bold text-[#134E4A] flex items-center gap-2">
            <TreeDeciduous className="w-5 h-5 text-[#3D5A45]" />
            4. Catàleg d'Espècies d'Interès i Comunitats Protegides
          </h2>
          <span className="text-xs px-3 py-1 bg-[#E9E9E0] text-[#134E4A] rounded-full font-medium self-start sm:self-auto">
            {PROTECTED_SPECIES_CATALOG.length} taxons i hàbitats clau
          </span>
        </div>

        <p className="text-xs sm:text-sm text-[#4A4A43] leading-relaxed">
          Els blocs de fondeig que han estat colonitzats per aquestes espècies i comunitats es consideren <strong>biòtops artificials renaturalitzats</strong>. La seva preservació in situ preval sobre la retirada per evitar la destrucció irreversible de biodiversitat protegida.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          {PROTECTED_SPECIES_CATALOG.map((sp) => (
            <div key={sp.scientificName} className="p-4 sm:p-5 rounded-2xl border border-[#D1D1C7] bg-[#FAF9F6] space-y-2 flex flex-col justify-between hover:border-[#134E4A] transition">
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-serif font-bold italic text-[#134E4A] text-sm sm:text-base leading-snug">
                    {sp.scientificName}
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                    sp.category === 'fucales'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : sp.category === 'seagrass'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : sp.category === 'coralligenous'
                      ? 'bg-rose-100 text-rose-900 border border-rose-300'
                      : sp.category === 'cnidarian'
                      ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                      : 'bg-sky-100 text-sky-900 border border-sky-300'
                  }`}>
                    {sp.category === 'fucales'
                      ? 'Fucals'
                      : sp.category === 'seagrass'
                      ? 'Fanerògama'
                      : sp.category === 'coralligenous'
                      ? 'Coral·ligen / Calcari'
                      : sp.category === 'cnidarian'
                      ? 'Cnidari'
                      : 'Mol·lusc'}
                  </span>
                </div>
                <div className="text-[#2D5A3C] font-semibold text-xs leading-snug">
                  {sp.commonNameCatalan}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#E9E9E0] text-[11px]">
                <div className="text-[#204E6B] leading-snug">
                  <strong className="text-[#133E59]">Marc de Protecció:</strong> {sp.protectionStatus}
                </div>
                <div className="text-[#5C6B5E] leading-relaxed">
                  <strong className="text-[#134E4A]">Valor Ecològic:</strong> {sp.conservationValue}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Bones Pràctiques per a Treballs Subaquàtics */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D1D1C7] space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#134E4A] flex items-center gap-2 border-b border-[#E9E9E0] pb-4">
          <Anchor className="w-5 h-5 text-[#3D5A45]" />
          5. Protocol de Bones Pràctiques en Extraccions Subaquàtiques
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#134E4A]">
          <div className="p-5 rounded-2xl bg-[#EBF3ED] border border-[#C5DDCB] space-y-2.5">
            <h3 className="font-serif font-bold text-[#1A4526] flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#2D5A3C]" />
              Tècniques Recomanades (Baix Impacte)
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-[#1A4526]">
              <li>Ús de <strong>globus reflotadors d'aire (lift bags)</strong> per aconseguir ascens vertical pur.</li>
              <li>Tall subaquàtic net de cadenes sense remoure el bloc en cas de protecció biològica.</li>
              <li>Condicions de mar en calma absoluta (onatge &lt;0,5 m).</li>
              <li>Embarcació auxiliar amb posicionament dinàmic o amarratge a boia ecològica.</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-[#FBF0EE] border border-[#EDC5C0] space-y-2.5">
            <h3 className="font-serif font-bold text-[#6B221D] flex items-center gap-1.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-[#8B322C]" />
              Tècniques Prohibides (Alt Impacte)
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-[#6B221D]">
              <li><strong>Arrossegament o tracció horitzontal</strong> amb embarcació (garreig forçat sobre praderia).</li>
              <li>Ús de maquinària pesant sense monitoratge biològic continu in situ.</li>
              <li>Extracció de blocs incrustats en mata consolidada de <em>Posidonia oceanica</em>.</li>
              <li>Abandonament de cadenes residuals al fons.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 6. Bibliografia i Marc Normatiu de Referència */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D1D1C7] space-y-5">
        <h2 className="text-xl font-serif font-bold text-[#134E4A] flex items-center gap-2 border-b border-[#E9E9E0] pb-4">
          <BookOpen className="w-5 h-5 text-[#3D5A45]" />
          6. Bibliografia i Marc Normatiu de Referència
        </h2>
        
        <p className="text-xs sm:text-sm text-[#4A4A43] leading-relaxed">
          Marc científic, legal i metodològic que fonamenta els criteris de ponderació d'impacte, dinàmica d'onatge i conservació d'hàbitats marins bentònics:
        </p>

        <ul className="space-y-3.5 text-xs text-[#2C3E35] leading-relaxed divide-y divide-[#E9E9E0]">
          <li className="pt-2 flex items-start gap-2">
            <span className="text-[#3D5A45] font-bold shrink-0">•</span>
            <div>
              <strong>Boletín Oficial del Estado.</strong> (2018). Real Decreto 1365/2018, de 2 de noviembre, por el que se aprueban las estrategias marinas. <em>Boletín Oficial del Estado</em>, 279, 111456–111463.{' '}
              <a
                href="https://www.boe.es/eli/es/rd/2018/11/02/1365"
                target="_blank"
                rel="noreferrer"
                className="text-[#134E4A] underline font-medium hover:text-[#0E3B38] inline-flex items-center gap-1"
              >
                <span>https://www.boe.es/eli/es/rd/2018/11/02/1365</span>
                <ExternalLink className="w-3 h-3 inline" />
              </a>
            </div>
          </li>

          <li className="pt-3.5 flex items-start gap-2">
            <span className="text-[#3D5A45] font-bold shrink-0">•</span>
            <div>
              <strong>Boletín Oficial del Estado.</strong> (2026). Real Decreto 191/2026, de 11 de març, per a la conservació de praderies de fanerògames marines en aigües marines del Mediterrani espanyol. <em>Boletín Oficial del Estado</em>, 64, 38806–38820.{' '}
              <a
                href="https://www.boe.es/eli/es/rd/2026/03/11/191"
                target="_blank"
                rel="noreferrer"
                className="text-[#134E4A] underline font-medium hover:text-[#0E3B38] inline-flex items-center gap-1"
              >
                <span>https://www.boe.es/eli/es/rd/2026/03/11/191</span>
                <ExternalLink className="w-3 h-3 inline" />
              </a>
            </div>
          </li>

          <li className="pt-3.5 flex items-start gap-2">
            <span className="text-[#3D5A45] font-bold shrink-0">•</span>
            <div>
              <strong>Bulleri, F., &amp; Chapman, M. G.</strong> (2010). The introduction of coastal infrastructure as a driver of change in marine environments. <em>Journal of Applied Ecology</em>, 47(1), 26-35.
            </div>
          </li>

          <li className="pt-3.5 flex items-start gap-2">
            <span className="text-[#3D5A45] font-bold shrink-0">•</span>
            <div>
              <strong>Carreras, J., Ferré, A., &amp; Ballesteros, E.</strong> (2012). <em>Informe sobre l'avaluació del grau d'amenaça i de l'interès de conservació dels diferents tipus d'hàbitats de Catalunya</em>. Generalitat de Catalunya &amp; Universitat de Barcelona.
            </div>
          </li>

          <li className="pt-3.5 flex items-start gap-2">
            <span className="text-[#3D5A45] font-bold shrink-0">•</span>
            <div>
              <strong>Diari Oficial de la Unió Europea.</strong> (2024). Reglamento (UE) 2024/1991 del Parlamento Europeo y del Consejo, de 24 de junio de 2024, relativo a la restauración de la naturaleza y por el que se modifica el Reglamento (UE) 2022/869. <em>Diario Oficial de la Unión Europea</em>, L 2024/1991.{' '}
              <a
                href="https://data.europa.eu/eli/reg/2024/1991/oj"
                target="_blank"
                rel="noreferrer"
                className="text-[#134E4A] underline font-medium hover:text-[#0E3B38] inline-flex items-center gap-1"
              >
                <span>https://data.europa.eu/eli/reg/2024/1991/oj</span>
                <ExternalLink className="w-3 h-3 inline" />
              </a>
            </div>
          </li>

          <li className="pt-3.5 flex items-start gap-2">
            <span className="text-[#3D5A45] font-bold shrink-0">•</span>
            <div>
              <strong>Duarte, C. M., Kennedy, H., Marbà, N., &amp; Hendriks, I.</strong> (2013). Assessing the capacity of seagrass meadows for carbon burial: Current limitations and future directions. <em>Oceanography</em>, 26(3), 40-51.
            </div>
          </li>

          <li className="pt-3.5 flex items-start gap-2">
            <span className="text-[#3D5A45] font-bold shrink-0">•</span>
            <div>
              <strong>Generalitat de Catalunya.</strong> (2016). <em>Protocol de bones pràctiques en el fondeig i l'ancoratge al litoral català</em>. Departament d'Agricultura, Ramaderia, Pesca i Alimentació, Direcció General de Pesca i Afers Marítims.
            </div>
          </li>

          <li className="pt-3.5 flex items-start gap-2">
            <span className="text-[#3D5A45] font-bold shrink-0">•</span>
            <div>
              <strong>Ministerio de Agricultura, Alimentación y Medio Ambiente.</strong> (2016). <em>Estrategias Marinas de España. Estudio Ambiental Estratégico</em>. Secretaría General Técnica.
            </div>
          </li>

          <li className="pt-3.5 flex items-start gap-2">
            <span className="text-[#3D5A45] font-bold shrink-0">•</span>
            <div>
              <strong>Ministerio para la Transición Ecológica.</strong> (2019). <em>Estrategias Marinas de España. Segundo Ciclo. Objetivos Ambientales. Demarcación Levantino-Balear</em>. Dirección General de Sostenibilidad de la Costa y del Mar.
            </div>
          </li>

          <li className="pt-3.5 flex items-start gap-2">
            <span className="text-[#3D5A45] font-bold shrink-0">•</span>
            <div>
              <strong>Ministerio para la Transición Ecológica y el Reto Demográfico.</strong> (2021). <em>Estrategia Nacional de Infraestructura Verde y de la Conectividad y Restauración Ecológicas</em>. Centro de Publicaciones del MITECO.
            </div>
          </li>

          <li className="pt-3.5 flex items-start gap-2">
            <span className="text-[#3D5A45] font-bold shrink-0">•</span>
            <div>
              <strong>Ministerio para la Transición Ecológica y el Reto Demográfico.</strong> (2023). <em>Plan Estratégico Estatal del Patrimonio Natural y de la Biodiversidad a 2030</em>. Centro de Publicaciones del MITECO.
            </div>
          </li>

          <li className="pt-3.5 flex items-start gap-2">
            <span className="text-[#3D5A45] font-bold shrink-0">•</span>
            <div>
              <strong>Montefalcone, M., Chiantore, M., Morri, C., &amp; Bianchi, C. N.</strong> (2007). The role of anchoring on the fragmentation of Posidonia oceanica meadows: a case study from the Ligurian Sea (North-Western Mediterranean). <em>Marine Pollution Bulletin</em>, 54(5), 652-660.
            </div>
          </li>

          <li className="pt-3.5 flex items-start gap-2">
            <span className="text-[#3D5A45] font-bold shrink-0">•</span>
            <div>
              <strong>Relini, G., Relini, M., &amp; Torchia, G.</strong> (2007). Trophic relationships in a multi-species artificial reef in the Ligurian Sea (North-Western Mediterranean). <em>Bulletin of Marine Science</em>, 81(3), 363-374.
            </div>
          </li>
        </ul>
      </div>

    </div>
  );
};
