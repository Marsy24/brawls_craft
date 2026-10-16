import type { ClassId, EnemyKind, Mission } from "../types";
import { CLASSES, ENEMIES, SKINS } from "../data/config";
export const svgUri = (svg: string) =>
  // Phaser calls atob for every data URL. Numeric entities keep XML ASCII.
  "data:image/svg+xml;base64," +
  btoa(svg.replace(/[^\x00-\x7f]/gu, (char) => `&#${char.codePointAt(0)};`));
let artSerial = 0;
/** Original vector illustrations. No third-party image assets or fonts. */
export function heroArt(
  id: ClassId,
  color = CLASSES[id].color,
  weapon = color,
  appearance = 0,
) {
  const mage = id === "mage",
    necro = id === "necromancer",
    warrior = id === "warrior",
    hunter = id === "hunter",
    rogue = id === "assassin";
  const variant = Math.max(0, SKINS.findIndex(s => s.color === weapon)) % 3;
  const skin = ["#c99e7d", "#8d6557", "#c9bdab"][appearance];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" fill="none"><defs><linearGradient id="armor" x1="100" y1="100" x2="240" y2="330" gradientUnits="userSpaceOnUse"><stop stop-color="${color}"/><stop offset=".45" stop-color="#34444a"/><stop offset="1" stop-color="#152329"/></linearGradient><linearGradient id="steel"><stop stop-color="#e1e5dd"/><stop offset=".5" stop-color="${weapon}"/><stop offset="1" stop-color="#49616d"/></linearGradient><radialGradient id="magic"><stop stop-color="${weapon}" stop-opacity=".75"/><stop offset="1" stop-color="${weapon}" stop-opacity="0"/></radialGradient></defs><ellipse cx="162" cy="370" rx="98" ry="18" fill="#080f14" opacity=".5"/><circle cx="163" cy="213" r="142" fill="url(#magic)" opacity=".22"/><path d="M115 141Q84 197 72 323L105 305 127 343 159 315 193 343 220 304 248 325Q235 201 201 144Z" fill="#19232c" stroke="${color}" stroke-opacity=".5" stroke-width="3"/><path d="M119 145Q101 234 89 311L119 294 148 319 158 160Z" fill="${color}" opacity=".22"/><path d="M135 270L119 348 142 357 161 280M169 279L184 357 209 349 191 264" fill="#253039" stroke="#0b171e" stroke-width="9"/><path d="M120 338L110 367 148 368 148 343M180 343L184 369 223 367 207 340" fill="url(#armor)" stroke="#81918b" stroke-width="3"/>
${mage || necro ? `<path d="M126 179L105 340Q159 362 211 338L189 178Z" fill="url(#armor)" stroke="${color}" stroke-width="3"/><path d="M157 202L148 346M172 203L185 345M118 318L205 318" stroke="${color}" opacity=".5" stroke-width="3"/>` : ""}<path d="M115 155L141 139 183 139 207 158 194 244 165 267 127 241Z" fill="url(#armor)" stroke="#81918b" stroke-width="3"/><path d="M131 166L162 181 191 163 183 219 161 235 139 218Z" fill="#263641" stroke="${color}" stroke-width="2"/><path d="M160 177L146 200 162 222 177 200Z" fill="${color}"/><path d="M127 235L193 235 198 250 122 250Z" fill="#201e1d" stroke="#ae966c" stroke-width="3"/><path d="M156 234H172V251H156Z" fill="#cfb481"/><path d="M113 160L88 218 107 238 134 177M200 159L225 216 209 239 184 178" fill="url(#armor)" stroke="#13222b" stroke-width="9"/><path d="M105 224L94 251 115 257 124 231M210 227L207 254 229 251 228 224" fill="${skin}" stroke="#24313a" stroke-width="4"/>
${warrior ? `<path d="M85 158L98 128 132 144 136 174 99 187Z M186 145L220 128 242 159 223 185 185 173Z" fill="url(#armor)" stroke="#c6b186" stroke-width="4"/><path d="M98 130L88 104 118 141M218 130L235 101 231 148" fill="#adb6b0"/>` : `<path d="M92 156L109 136 139 154 120 183Z M183 152L213 137 234 157 209 185Z" fill="url(#armor)" stroke="${color}" stroke-width="3"/>`}
<path d="M139 111L144 148Q160 165 181 145L185 109Z" fill="${skin}" stroke="#18252d" stroke-width="4"/><path d="M132 107Q130 61 161 60Q197 63 195 108L181 102 177 83 155 96 140 105Z" fill="${rogue || necro ? "#1d2533" : "#453c35"}"/><path d="M140 117L151 119M169 119L180 116" stroke="${necro || mage ? weapon : "#1d272d"}" stroke-width="5"/><path d="M157 134L169 134" stroke="#684c43" stroke-width="3"/>
${warrior ? `<path d="M129 105L136 72 160 58 188 73 197 104 181 112 177 87 163 97 148 86 146 113Z" fill="url(#armor)" stroke="#c6b186" stroke-width="3"/><path d="M156 58L163 29 174 61" fill="${color}"/>` : hunter || rogue || necro ? `<path d="M126 120Q112 84 162 44Q208 76 201 122L181 106 166 76 145 101Z" fill="url(#armor)" stroke="${color}" stroke-width="3"/>${rogue ? '<path d="M139 124L182 123 176 149 154 153Z" fill="#2d333c"/>' : ""}` : `<path d="M127 100L160 24 194 102 173 84 152 91Z" fill="url(#armor)" stroke="${color}" stroke-width="3"/><path d="M143 64L172 74M136 81L181 92" stroke="#b6bdac" stroke-width="3"/>`}
${warrior ? `<path d="M61 168L104 157 130 182 120 248 94 273 65 244Z" fill="#263c48" stroke="#d0b281" stroke-width="6"/><path d="M95 174L78 205 94 244 112 204Z" fill="${color}"/><g transform="rotate(15 233 250)"><path d="${variant === 1 ? "M220 240L216 155 205 144 223 128 235 78 251 128 266 144 252 155 246 240Z" : variant === 2 ? "M224 240L215 201 225 173 217 144 237 86 249 143 243 171 254 198 244 240Z" : "M225 240L222 119 236 91 251 119 244 240Z"}" fill="url(#steel)" stroke="#2f444a" stroke-width="3"/><path d="M235 118V221M228 145L241 137M229 178L241 170" stroke="${weapon}" stroke-width="3"/><path d="M213 239H256L250 252H218Z" fill="#d4b47c"/><path d="M229 251H240V284H229Z" fill="#5b4640"/></g>` : hunter ? `<path d="${variant === 1 ? "M230 97L257 125 270 172 294 191 278 218 295 243 270 261 252 307 227 335 246 282 253 225 249 158Z" : variant === 2 ? "M234 104Q326 142 280 215Q326 285 231 333L256 280 260 225 254 161Z" : "M237 113Q307 223 235 320L252 225Z"}" fill="#604c36" stroke="${weapon}" stroke-width="6"/><path d="M237 113L214 226 235 320" stroke="#c6d4c1" stroke-width="2"/><path d="M199 225L295 216 283 207M295 216L285 228" stroke="url(#steel)" stroke-width="4"/><path d="M92 138L111 161M86 147L105 170" stroke="#8fa8a5" stroke-width="4"/>` : rogue ? `<path d="${variant === 1 ? "M94 246L63 275 68 291 51 310 68 330 113 256Z M215 248L247 275 242 292 259 312 242 330 202 258Z" : variant === 2 ? "M94 246Q52 278 68 326L84 297 113 256Z M215 248Q259 280 240 326L226 296 202 258Z" : "M94 246L64 301 73 322 113 256Z M215 248L246 300 237 320 202 258Z"}" fill="url(#steel)" stroke="${weapon}" stroke-width="3"/><path d="M85 247L115 265M202 262L231 247" stroke="#b5a27d" stroke-width="6"/>` : `<path d="M226 115L228 352" stroke="#8f755d" stroke-width="10"/><path d="${variant === 1 ? "M225 126L199 108 196 75 212 48 218 75 226 40 238 76 252 47 259 82 251 109 233 126Z" : variant === 2 ? "M225 126Q182 101 211 55L218 81 227 40 240 74 249 54Q273 100 233 126Z" : "M225 126L203 91 215 58 226 85 238 58 250 89 233 126Z"}" fill="url(#steel)" stroke="${weapon}" stroke-width="3"/><circle cx="226" cy="90" r="48" fill="url(#magic)"/><path d="M226 62L213 89 227 111 240 88Z" fill="${weapon}"/><path d="M220 81L227 72 232 87" stroke="#f1efe1" stroke-width="3"/><circle cx="104" cy="249" r="34" fill="url(#magic)"/><path d="M104 229L93 249 104 268 116 248Z" fill="${weapon}"/>`}
${necro ? `<path d="M147 190Q160 175 176 189L174 207 165 210V218H156V211L146 207Z" fill="#dddcc5"/><path d="M151 193L158 198M170 193L163 198" stroke="#29343c" stroke-width="5"/>` : ""}</svg>`;
  const suffix = `-${++artSerial}`;
  return svg
    .replace(/id="(armor|steel|magic)"/g, (_, id) => `id="${id}${suffix}"`)
    .replace(/url\(#(armor|steel|magic)\)/g, (_, id) => `url(#${id}${suffix})`);
}
export function enemyArt(kind: EnemyKind) {
  const cls: ClassId =
    kind === "archer"
      ? "hunter"
      : kind === "shaman" || kind === "oracle"
        ? "necromancer"
        : kind === "stalker"
          ? "assassin"
          : "warrior";
  return heroArt(
    cls,
    ENEMIES[kind].color,
    kind === "oracle" ? "#ed91e9" : "#bb7e67",
    2,
  );
}
export function treeArt() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 190"><ellipse cx="74" cy="168" rx="60" ry="19" fill="#071b19" opacity=".5"/><path d="M61 106L55 170 75 180 90 165 80 95" fill="#554937" stroke="#2e3328" stroke-width="5"/><path d="M60 142L40 121M77 134L105 110" stroke="#6a5a40" stroke-width="9"/><path d="M71 3L43 37 22 47 30 69 8 89 21 111 12 129 40 141 62 133 83 146 112 129 132 125 122 98 136 83 113 56 99 30Z" fill="#284c42" stroke="#18362f" stroke-width="5"/><path d="M71 6L42 48 67 40 30 83 55 75 26 112 63 98 88 116 120 105 100 77 115 81 92 49 96 42Z" fill="#3e6550"/><path d="M70 20L53 49 74 43 48 74 78 64 101 81 84 47Z" fill="#587a59"/><path d="M41 117L61 105M87 127L108 115M24 92L37 85" stroke="#77946b" stroke-width="3" opacity=".5"/></svg>`;
}
export function rockArt(pillar = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150"><ellipse cx="60" cy="128" rx="55" ry="17" fill="#09191c" opacity=".6"/>${pillar ? '<path d="M33 125V41L25 35 31 17 73 9 91 29 83 40V121Z" fill="#5a6a69" stroke="#303e41" stroke-width="4"/><path d="M33 41L58 47 83 40M58 47V128M31 18L57 29 88 24" fill="none" stroke="#87928a" stroke-width="3"/><path d="M43 60L49 72 43 84 48 94M67 60L73 67 67 76 74 89" stroke="#b0bc8a" fill="none" stroke-width="3"/>' : '<path d="M9 112L26 65 51 46 83 53 108 87 111 122 69 138 24 131Z" fill="#53616a" stroke="#2e3e46" stroke-width="4"/><path d="M26 66L55 78 83 54 96 89 70 112 22 115Z" fill="#78858a"/><path d="M55 78L70 112 70 137M96 88L110 122" stroke="#44555d" fill="none" stroke-width="3"/><path d="M33 72L51 83M39 104L54 97" stroke="#a1aca7" stroke-width="3"/>'}</svg>`;
}
export function landscapeArt(biome: Mission["biome"] = "forest") {
  const colors = {
    forest: ["#142c31", "#385b55", "#799080", "#a4b6a0"],
    ruins: ["#1e2836", "#53596b", "#96948a", "#c0b99e"],
    cave: ["#111c30", "#313954", "#767498", "#b1acd4"],
    keep: ["#271f29", "#574b53", "#a08872", "#c6b18c"],
    sanctum: ["#201d34", "#55446e", "#9b83ad", "#cebbda"],
  }[biome];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 900"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient><linearGradient id="fog" x2="0" y2="1"><stop stop-color="${colors[3]}" stop-opacity=".4"/><stop offset="1" stop-color="${colors[0]}" stop-opacity="0"/></linearGradient></defs><path fill="url(#sky)" d="M0 0H1400V900H0Z"/><circle cx="1000" cy="180" r="82" fill="${colors[3]}" opacity=".55"/><circle cx="1033" cy="151" r="76" fill="${colors[0]}" opacity=".55"/><path d="M0 410L160 204 255 352 380 142 568 372 770 218 920 372 1130 233 1400 403V900H0Z" fill="${colors[1]}"/><path d="M160 204L112 318 163 287 196 302ZM380 142L320 274 384 231 422 266ZM770 218L731 293 780 267 805 291Z" fill="${colors[3]}" opacity=".22"/><path d="M680 498V304L720 279V220L744 205 766 222V289L793 315V397H836V273L865 249V182L888 166 910 184V262L936 289V410H958V350L984 331V289L1008 273 1034 294V348L1051 364V500Z" fill="${colors[0]}"/><path d="M735 242H749V260H735ZM875 204H889V225H875ZM1001 309H1016V326H1001Z" fill="#e3c38b" opacity=".7"/><path d="M0 492Q230 345 461 488T903 465T1400 478V900H0Z" fill="${colors[1]}"/><path d="M0 530Q420 462 710 542T1400 510V680H0Z" fill="url(#fog)"/><path d="M0 705Q269 491 492 644T901 608T1400 616V900H0Z" fill="${colors[0]}"/><path d="M470 900Q910 728 901 614Q895 575 953 542" stroke="${colors[2]}" stroke-width="38" fill="none" opacity=".3"/>${[60, 130, 220, 310, 1160, 1250, 1350].map((x, i) => `<g transform="translate(${x} ${380 + (i % 3) * 80}) scale(${1 + (i % 2) * 0.6})"><path d="M0 0L-60 130 -35 121 -77 197 -41 183 -94 254 -14 236 -16 330H16L14 239 90 252 49 189 75 201 36 126 58 137Z" fill="#0e2227"/></g>`).join("")}<path d="M0 843Q290 758 510 857T1400 821V900H0Z" fill="#0d191f"/><g fill="#eecb8b" opacity=".7">${Array.from({ length: 25 }, (_, i) => `<circle cx="${(i * 157 + 73) % 1400}" cy="${((i * 97 + 380) % 500) + 330}" r="${(i % 3) + 1}"/>`).join("")}</g></svg>`;
}
