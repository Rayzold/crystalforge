// silhouettes.jsx — heroic posed warrior silhouettes (male + female).
// Hands-on-hips power stance. Cape stays narrow behind the torso (keeps the
// arm/torso triangles open) and drapes to mid-thigh; below it the armored legs
// read as planted, boots apart, with a clear center gap.
// Symmetric right-half mirrored across x=150. fill = currentColor. viewBox 300x640.

const MALE = {
  cape:    "M150,150 C172,150 184,160 186,186 C188,232 183,330 192,402 C200,432 206,444 204,452 L184,432 L174,456 L160,434 L150,448 Z",
  leg:     "M150,406 L186,400 C192,442 191,472 191,498 C191,542 189,576 188,592 C201,598 213,606 215,620 L166,620 C164,608 162,600 162,594 C160,558 168,520 168,500 C166,456 156,428 150,406 Z",
  arm:     "M182,170 C214,178 244,214 254,250 C246,286 212,310 193,320 L173,316 C193,301 218,279 222,256 C216,230 193,199 174,184 Z",
  torso:   "M150,110 L169,116 C177,124 179,134 179,144 C197,149 206,164 206,186 C205,228 196,272 181,300 C178,306 175,310 174,314 C190,320 198,332 198,353 C198,383 191,399 181,406 L150,406 Z",
  pauldron:"M166,148 C194,130 228,137 238,162 C243,180 234,196 211,199 C190,201 175,192 169,178 C165,166 163,154 166,148 Z",
  helm:    "M150,26 L161,34 L156,54 C172,60 179,78 179,94 C179,110 168,121 150,123 Z",
};

const FEMALE = {
  cape:    "M150,150 C170,150 182,160 184,186 C186,232 181,330 190,402 C198,432 204,444 202,452 L183,432 L173,456 L160,434 L150,448 Z",
  leg:     "M150,408 L182,402 C188,444 187,474 187,500 C187,544 185,578 184,594 C195,600 206,608 208,620 L164,620 C162,608 160,600 160,594 C158,560 165,520 165,500 C163,458 154,430 150,408 Z",
  arm:     "M178,176 C208,184 234,216 243,250 C236,284 205,306 188,316 L170,312 C190,298 212,278 215,256 C210,232 188,202 172,188 Z",
  torso:   "M150,112 L167,117 C174,125 176,134 176,143 C192,148 200,162 200,184 C199,222 191,262 178,294 C175,302 172,306 171,310 C187,316 195,330 197,356 C199,388 188,402 175,408 L150,408 Z",
  pauldron:"M168,150 C190,136 214,142 223,164 C228,180 221,192 205,196 C189,198 176,190 170,177 C166,168 165,158 168,150 Z",
  helm:    "M150,28 L158,36 L155,54 C170,60 178,76 178,92 C178,108 167,119 150,121 Z",
};

function halfPaths(p) {
  return (
    <g>
      <path d={p.cape} />
      <path d={p.leg} />
      <path d={p.arm} />
      <path d={p.torso} />
      <path d={p.pauldron} />
      <path d={p.helm} />
    </g>
  );
}

function Silhouette({ gender = "male", className = "" }) {
  const p = gender === "female" ? FEMALE : MALE;
  return (
    <svg className={`silhouette ${className}`} viewBox="0 0 300 640"
         width="100%" height="100%" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <g fill="currentColor" stroke="none">
        {halfPaths(p)}
        <g transform="matrix(-1 0 0 1 300 0)">{halfPaths(p)}</g>
      </g>
    </svg>
  );
}

window.Silhouette = Silhouette;
window.FIGURE = { w: 300, h: 640 };
