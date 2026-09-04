# -*- coding: utf-8 -*-
"""Image prompts for all 126 Scarred Lands spells.

One subject line per spell, describing what is actually VISIBLE — not what the
spell does mechanically. Each is joined to the shared style block below.

Two rules learned the hard way on the NPC portraits:
  * the sampler runs at CFG 1.0, which makes the negative prompt mathematically
    inert, so no negation may appear here — describe what IS in the frame
  * the icon is displayed at 72px, so every subject needs one strong shape

Keys are the codex slugs from build-codex-book.py's slug(); the ComfyUI
filename prefix is sp_{slug}.
"""

_S = (" Dark fantasy anime illustration, clean digital painting with refined delicate linework, "
      "rendered low-key: deep crushed blacks, heavy chiaroscuro, most of the scene falling away "
      "into shadow, a hard rim light carving shapes out of near-darkness. Desaturated ash and "
      "iron palette where the only saturated colour is the magic itself. Grim, oppressive, "
      "cinematic. Square composition, centred, a strong simple silhouette that stays legible at "
      "thumbnail size, high detail, crisp finish.")

SUBJ = {

# ------------------------------------------------------------------ cantrips
'bog-light':
  "A single pale mote of light hovering low over black bog water, its glow picking out a "
  "submerged shape just beneath the surface.",
'caravan-tether':
  "A thin taut thread of cold light running away into a wall of white fog, one gloved hand "
  "closed around its near end.",
'glass-splinter':
  "A long shard of clear glass in flight, lit along one edge, trailing a fine line of blood-red "
  "light behind it.",
'grave-quiet':
  "A shrouded body lying still on stone under a settled grey hush, like a second sheet laid over "
  "the first.",
'nanite-mend':
  "A cracked ceramic bowl rejoined by a thick ugly seam of glowing metal, the repair far more "
  "visible than the break ever was.",
'petrichor-sign':
  "A bare hand held palm-up beneath a bruised sky, one clean drop of rain striking it and "
  "throwing out a ring of light.",
'quiet-the-panic':
  "A steady hand laid flat on the neck of a rearing horse, a calm blue glow spreading out from "
  "the palm.",
'read-the-emblem':
  "A glowing emblem hanging in the dark, a ranked row of marks filling in along it from the "
  "lowest to the highest.",
'rust-touch':
  "A gauntleted fist crumbling into orange rust, the flakes falling away through an arc of acid "
  "light.",
'scarecall':
  "A dark treeline with something enormous shifting behind it, small shapes breaking cover and "
  "fleeing toward the viewer.",
'shardlight':
  "A jagged crystal shard burning with hard white light, holding back a wall of living darkness "
  "on every side.",
'static-draw':
  "A thin branching arc of lightning leaping to a metal buckle, the metal glowing white at the "
  "point of contact.",

# --------------------------------------------------------------------- 1st
'caravan-pace':
  "A line of travellers walking fast along a dark road, their boots trailing streaks of pale "
  "light behind them.",
'datasphere-echo':
  "A head in profile with a lattice of thin bright lines lifting off the skull like escaping "
  "smoke.",
'false-emblem':
  "A glowing threat emblem seen from behind, a modest true mark showing on the reverse while the "
  "face of it reads enormous.",
'favour-called-due':
  "Two hands, one open and empty, the other stopped mid-reach and bound at the wrist by a single "
  "thread of gold light.",
'fixed-point':
  "One figure standing perfectly sharp and still while everything around it blurs into streaks of "
  "motion.",
'ground-truth':
  "A bare hand pressed into dark soil, glowing contour lines spreading outward from it across the "
  "ground.",
'last-words':
  "A dead mouth open in the dark with a single small ember of light rising out of it.",
'latent-compulsion':
  "A sigil buried under the skin of a forearm, faint, its edges just beginning to warm.",
'not-worth-the-trouble':
  "A heavily loaded cart standing in plain sight, rendered dull and grey while everything around "
  "it stays sharp.",
'oathmark':
  "A glowing brand on an armoured shoulder with a thread of light running from it off the edge of "
  "the frame.",
'oilslick':
  "A shattered flask on ice, black oil spreading in a wide slick that catches one cold highlight.",
'read-the-road':
  "A road forking in the dark, one of the two branches lit by a low steady glow along its ruts.",
'shroudlamp':
  "A lantern set on the ground throwing a hard circle of white light, grey rot pressing in at the "
  "edge of the circle.",
'skyquake-crack':
  "A single white crack splitting a black sky, the air around it warping outward in rings.",
'spark-tap':
  "A hand drawing a thread of blue charge out of a dead device and into a waiting crystal.",
'staunch':
  "A wound closing under a palm of warm gold light, the last of the bleeding drawn back inward.",
'the-kind-word':
  "A lone unarmed figure speaking quietly while a ring of gaunt undead recoils from the sound.",
'tier-sense':
  "A figure at the centre of a dark sphere, distant shapes marked as points of coloured light at "
  "different depths around it.",
'tiercall':
  "A single raised hand and one spoken word, and a huge beast turning away into the dark.",

# --------------------------------------------------------------------- 2nd
'anchorhold':
  "Three figures held in place by heavy chains of light driven into the ground, time smearing "
  "past them.",
'cinderfall':
  "A wide column of falling ash and orange embers coming down through darkness onto bare stone.",
'copper-and-blood':
  "A blade drawn back from a wound, the blood coming off it bright green and smoking where it "
  "lands.",
'cut-the-trail':
  "A line of footprints in ash that simply stops, the ash beyond it smooth and undisturbed.",
'drown-in-color':
  "A face lost inside a violent swirl of saturated colour, the one saturated thing in the frame.",
'elemental-burst':
  "A sphere of white lightning bursting outward at ground level, metal fittings around it glowing "
  "along their seams.",
'glass-spike':
  "Long spikes of glass erupting upward through the ground, fine glittering dust hanging in the "
  "air around them.",
'hold-the-doorway':
  "An armoured figure planted in a narrow stone doorway, braced, filling it completely.",
'machinebreaker-s-silence':
  "A dead machine standing in a circle of stillness, its indicator lights going out one by one.",
'nervebreak':
  "A figure doubled over holding its own head, thin dark lines of pain radiating outward from "
  "unbroken skin.",
'quarry-of-the-wastes':
  "A single glowing arrow of light hanging in a vast empty waste, pointing steadily at the "
  "horizon.",
'shadowstorm':
  "A dense boiling shadow rolling down a lit street, swallowing every lamp as it passes.",
'shieldbearer-s-vow':
  "Two figures side by side with a shield of light spanning from one of them to the other.",
'sound-maker-s-bluff':
  "A small device on a rock throwing an enormous horned shadow onto the cliff face behind it.",
'spark-cleansing':
  "A cube of clean white radiance burning grey residue out of the air, the residue peeling away "
  "at its edges.",
'spite-s-dividend':
  "A blow landing on armour, half of it flying straight back out as a spear of violet light.",
'the-envious-eye':
  "A single narrowed eye rendered in cold light, watching another figure succeed far off in the "
  "dark.",
'threadweave':
  "An old ring held up between two fingers, a bright thread unwinding from it into the image of a "
  "hand.",
'veilblade':
  "A blade drawn upward out of a figure's own shadow, the shadow parting around it like water.",

# --------------------------------------------------------------------- 3rd
'aegis-field':
  "A dome of hard light taking an impact, the strike flattening against it and half of it firing "
  "back out as force.",
'bind-the-beast':
  "A large predator lowering its head to a still outstretched hand, a faint circle of light on the "
  "ground between them.",
'carnival-of-wounds':
  "A wounded figure laughing, bright ribbons of colour pouring from the wound in place of blood.",
'hollow-hunger':
  "A gaunt figure with a hollow of pure darkness where its stomach should be, both hands closing "
  "on empty air.",
'judgement-of-the-scar':
  "A pillar of white radiance coming down onto one kneeling figure marked with a black scar.",
'jupito-call':
  "A small round creature of drifting light standing on bare ground, larger ghost outlines of "
  "itself stacked up behind it.",
'mana-harvest':
  "A crystal growing on a stand, drawing thin threads of ambient light in from every direction.",
'nanite-bloom':
  "A sword lying on stone with a bloom of fine silver machinery spreading along its blade like "
  "frost.",
'nanite-storm':
  "A dense cloud of tiny silver flecks moving through the air, every one of them catching a hard "
  "point of light.",
'riftstep':
  "A figure half gone into a vertical tear in the air, the ground it stood on left cracked and "
  "glowing.",
'ruinfester':
  "A swarm of small dark insects boiling up out of a crack in a ruined floor.",
'scarmist':
  "A grey mist in which a road, a wall and a horizon all sit at wrong angles to one another.",
'shieldwright-s-ward':
  "A small dome of city-shield light standing alone on open ground, rain sliding off its curve.",
'spellwraith-snare':
  "A ring of burning glyphs on stone with a translucent figure caught inside, pressing at the "
  "boundary.",
'standing-order':
  "Five armoured figures moving as one, a single line of glowing script running across all their "
  "shields.",
'the-fool-s-revelation':
  "A head thrown back with light pouring into its open eyes and mouth, far more of it than the "
  "head can hold.",
'the-last-applause':
  "A falling figure snapping upright for one final swing, lit hard from behind.",
'the-lingering-toll':
  "A hand with dark decay creeping up from the fingertips in slow visible stages.",
'the-long-wasting':
  "A figure grown thinner than the shadow it casts, the shadow keeping the older fuller shape.",
'the-starving-void':
  "A small black sphere hanging above the ground with dust, stones and light bending inward "
  "toward it.",
'wyldergrowth':
  "Thick thorned briar erupting from the ground into a tangled wall, dark red heartwood showing "
  "at the breaks.",

# --------------------------------------------------------------------- 4th
'bitter-inheritance':
  "A figure on its knees at the moment of collapse, one hand still raised and burning with a last "
  "spell.",
'conduit-s-exchange':
  "Two figures joined by a single beam of light, gold entering the one and red leaving the other.",
'dawn-and-dusk':
  "One face lit from the left by warm dawn light and from the right by cold dusk light, the two "
  "meeting down the middle.",
'debt-of-flesh':
  "A wound held open and unbleeding, its damage suspended above it as a hanging knot of dark "
  "light.",
'flat-rain':
  "A wall of water driving sideways in a wide cone, flattening everything in its path.",
'lifeweaver-s-touch':
  "A severed arm regrowing from the stump in coils of pale light, crude and visibly unfinished.",
'living-cyclone':
  "A tight column of whirling wind and debris standing upright on open ground.",
'machinemeld':
  "A figure fused into the open chest of a machine, its own limbs continuing outward as "
  "mechanical ones.",
'null-surge':
  "A spell caught and unravelling in mid-air, its threads coming apart into a small hovering "
  "residue.",
'ode-to-the-moons':
  "A singer standing under two moons while the creatures around stagger and lose their footing.",
'psionic-static':
  "A head ringed by jagged broken bands of interference, the features inside doubled and "
  "misaligned.",
'runebound':
  "Four burning runes hanging in the air around a figure, their shapes unfamiliar and unreadable.",
'succubus-kiss':
  "A kiss in near-darkness with a thread of pale vitality drawn out between the two mouths.",
'thunder-booms':
  "A wide ring of lightning striking every piece of metal in a crowd at once.",
'unbroken-line':
  "A rank of figures standing shoulder to shoulder with one continuous band of light running "
  "across their feet.",
'weight-of-the-oath':
  "A figure straining forward against empty air, held back by glowing oath-script wrapped around "
  "its chest.",

# --------------------------------------------------------------------- 5th
'deepfreeze':
  "A cube of air gone solid with frost, everything caught inside it locked in blue-white ice.",
'doublemoon':
  "Two full moons hanging close together above a low bare horizon, the left moon pale bone-white, "
  "the right moon deep scarlet, each casting its own separate wash of light across the empty "
  "ground below so the two lights cross.",
'last-watch':
  "A figure standing upright on a battlefield, run through and burning with white light, still on "
  "its feet.",
'nexus-step':
  "Six figures in formation dissolving into vertical lines of light, the formation still intact "
  "as they go.",
'query-the-data-layer':
  "A face lit from below by a floating lattice of data, three different answers overlapping in "
  "the light.",
'rageform':
  "A figure swelling larger with every impact, cracks of red light opening across its skin.",
'shroudfall':
  "A pocket of grey rot dropped over open ground, the grass inside it already dead.",
'swallow-the-sun':
  "A sphere of absolute darkness hanging in daylight, the light bending away around its edge.",
'the-bog-answers':
  "Still black water holding the clear reflected image of a different place entirely.",
'the-dampening':
  "Six figures standing calm and slack-faced in the middle of a fight, a flat grey field settled "
  "over all of them.",
'the-long-hunt':
  "A hunter's eye in close darkness with one bright thread running from it to a distant point.",

# --------------------------------------------------------------------- 6th
'ashenborn-summons':
  "An ash-skinned warrior stepping out of a column of fire, the cracks across its body glowing "
  "furnace orange.",
'brimstone-grid':
  "A grid of burning lines laid across the ground with lightning running along every "
  "intersection.",
'cataclysm-ward':
  "A sealed dome standing intact while a storm of glass shards breaks against it.",
'eye-of-the-observatory':
  "A vast brass eye opening in an observatory dome, weather patterns turning inside its iris.",
'skyfall-lance':
  "A single lance of fire coming straight down out of the sky into cracked ground.",
'the-factory-s-patience':
  "An ancient machine reassembling itself piece by piece and resuming its work.",
'vortex-well':
  "A well of inverted gravity with metal debris orbiting it in a fast bright ring.",
'wonder-s-echo':
  "A ritual circle with the ghost-image of a vast unknown structure standing at its centre.",

# --------------------------------------------------------------------- 7th
'chrono-eddy':
  "A spiral of accelerated time on open ground, the figure inside it visibly ageing as it stands.",
'cosmic-flutter':
  "A cube of unstable reality where the ground, the sky and a figure each render as a different "
  "impossible material.",
'guardian-s-refusal':
  "One figure standing with arms spread, a wall of force light stopping a charge dead thirty feet "
  "out.",
'rift-suture':
  "A dimensional tear being stitched closed with thread of hard light, an eye visible in the last "
  "of the gap.",
'scarwalk':
  "A figure walking into the Scar's grey mist, its outline already emerging different on the far "
  "side.",
'the-dead-choir':
  "A field of open graves with a thin voice of light rising out of every one of them.",
'the-ode-to-the-moons':
  "A vast crowd frozen mid-motion, every head turned toward one small distant singer.",
'waterfall-shower':
  "An entire river falling out of the sky onto a single point of ground.",

# --------------------------------------------------------------------- 8th
'apocalypse-emblem':
  "A burning emblem of the highest threat rank hanging over a figure, everything around it "
  "fleeing outward.",
'glass-cathedral':
  "A cathedral of standing glass shards risen out of the ground, light refracting through the "
  "whole maze.",
'hairline-scar':
  "A hand-wide vertical rift in the air, absolute black inside it, one hand reaching toward the "
  "opening.",
'sever-the-thread':
  "A bright thread running from a figure's chest, cut clean through, both ends going dark.",
'the-long-calm':
  "An unnaturally still landscape under a flat sky, with shapes gathering at the far edge of it.",
'throne-shadow':
  "A throne of shadow with six figures kneeling before it, all of them facing one direction.",
'unmake-the-wonder':
  "A vast machine going permanently dark one function at a time, a record of it written in light "
  "beside it.",

# --------------------------------------------------------------------- 9th
'call-the-reclamation':
  "A doorway of fire opened on bare ground with something enormous stepping through it, "
  "indifferent to the small figure that called it.",
'datasphere-communion':
  "A figure standing inside a vast lattice of pre-Scarring light, every node of it turned toward "
  "them.",
'rewrite-the-hour':
  "A figure standing still while the world runs backwards around it in streaks of reversed light.",
'the-last-shield':
  "An enormous dome of light standing over a settlement, monsters massed outside and unable to "
  "enter.",
'the-second-scarring':
  "A sphere of white force detonating over a landscape, the ground beneath it turning permanently "
  "to scar.",
}

PROMPTS = {k: v + _S for k, v in SUBJ.items()}
