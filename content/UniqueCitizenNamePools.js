// Unique citizens draw from a curated pool of 300 fantasy-oriented full names.
// The given/family pieces stay editable so more names can be generated later.
export const UNIQUE_CITIZEN_GIVEN_NAMES = [
  "Aelric","Aelwen","Aerin","Aldren","Althaea","Alric","Amarys","Anwyn","Arctheris","Arianne",
  "Arlen","Armina","Arthen","Aster","Aveline","Bastivar","Belthar","Brenna","Brennor","Briseis",
  "Brynden","Caelan","Caelric","Caelys","Calista","Cassian","Cedren","Cerys","Corwin","Cyrene",
  "Daelor","Dain","Damaris","Delphara","Dorevyr","Draeven","Edrin","Eirwen","Elaria","Elowen",
  "Emrys","Endric","Eryndor","Evania","Evendros","Faelan","Faelynn","Fenric","Fenra","Fintan",
  "Fiora","Galivor","Garrivar","Gavriel","Gwyneira","Halric","Heliora","Herovar","Hestrel","Idravel",
  "Ilyra","Iseult","Isolde","Ivaris","Jareth","Jessara","Jorren","Jorvik","Kael","Kaelen",
  "Kaelora","Kaivra","Kellan","Kerensa","Kestrel","Korren","Leandor","Leoric","Liora","Lirael",
  "Lorcan","Luceryn","Lucivar","Luneth","Lysandra","Lysandor","Maelis","Mairen","Malric","Marrok",
  "Mavric","Melian","Meridia","Mireth","Mirelle","Morwen","Myrren","Naevys","Nerisse","Nerys",
  "Nuala","Nymera","Nyra","Nyssara","Obreth","Odran","Oryndar","Oriava","Orik","Orlian",
  "Osric","Palyra","Perivane","Phaedra","Quenara","Quillan","Quorin","Raelor","Rhivara","Riven",
  "Roderic","Ronovar","Roswyn","Rovaine","Sable","Selenyx","Selvara","Seravelle","Siora","Sorevyn",
  "Sorin","Sylra","Sylvara","Taliah","Tarian","Tavian","Thalen","Thamira","Theravar","Thessa",
  "Torin","Torven","Trystan","Ulric","Uthric","Vaelin","Vaessa","Valessa","Varen","Vespera",
  "Veyla","Vireya","Wyren","Wystan","Xavian","Xyra","Yariveth","Ysolde","Ysella","Zephyra"
];

export const UNIQUE_CITIZEN_FAMILY_NAMES = [
  "Amberwake","Ashthorn","Blackbriar","Brightforge","Cloudmere","Coldharbor","Dawnmere","Dreadvale","Duskwatch","Emberfall",
  "Evenstar","Fairwind","Farspire","Firelace","Frostmere","Galecrest","Glimmerwake","Goldbranch","Grayfen","Grimward",
  "Halewood","Hawkrise","Hollowmere","Ironvale","Keenriver","Kestrelwake","Lightweave","Lionshade","Longspear","Moonvale",
  "Mournriver","Nightbloom","Oakvein","Palehart","Quickwater","Ravencrest","Redbranch","Riftwarden","Riverglass","Runebriar",
  "Shadefen","Shadowmere","Silverwake","Skythorn","Snowvale","Starweave","Stillwater","Stoneheart","Stormward","Sunvale",
  "Thornfield","Thundershade","Umbermere","Valeborn","Velvetthorn","Whispermere","Wildbriar","Wyrmwatch","Alderbrand","Ashenmere",
  "Brineglass","Bronzebloom","Cindervale","Clearwatch","Crownhollow","Dawnspear","Deeproot","Driftward","Ebonmere","Fablethorn",
  "Fallowmere","Featherwind","Fellbranch","Flintwake","Gloamriver","Goldwake","Greenveil","Hearthvale","Highwater","Hollowbranch",
  "Icevein","Ironbloom","Juniperward","Kingshade","Larkspire","Mistbriar","Moonwake","Mossriver","Nightglass","Northvale",
  "Oakenwatch","Paleshade","Quickthorn","Rainmere","Rimeward","Roseveil","Runeshard","Seabriar","Skyglass","Softwind",
  "Southmere","Starfall","Stoneveil","Stormglass","Summerfield","Thornvale","Truebranch","Westward","Wintermere","Wyrmvale",
  "Brightspear","Cloudthorn","Duskfen","Embermere","Goldthorn","Graywatch","Moonbranch","Nightward","Riverthorn","Stormvale",
  "Sunwatch","Whitethorn","Wildermere","Windharbor","Runeward","Driftshade","Brassmere","Cedarwake","Oakenshade","Starward",
  "Flamebriar","Mistward","Wolfmere","Silvershade","Hollowthorn","Firemere","Violetvale","Brightfen","Dawnweave","Stormhollow"
];

function greatestCommonDivisor(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
}

export const UNIQUE_CITIZEN_FULL_NAMES = (() => {
  const names = [];
  const givenCount = UNIQUE_CITIZEN_GIVEN_NAMES.length;
  const familyCount = UNIQUE_CITIZEN_FAMILY_NAMES.length;
  const totalCombinations = givenCount * familyCount;
  const targetCount = Math.min(300, totalCombinations);
  if (!targetCount) {
    return names;
  }

  const startIndex = 37 % totalCombinations;
  let step = Math.max(7, Math.floor(totalCombinations / targetCount) + 1);
  while (greatestCommonDivisor(step, totalCombinations) !== 1) {
    step += 1;
  }

  for (let index = 0; index < targetCount; index += 1) {
    const flatIndex = (startIndex + index * step) % totalCombinations;
    const givenIndex = Math.floor(flatIndex / familyCount);
    const familyIndex = flatIndex % familyCount;
    names.push(`${UNIQUE_CITIZEN_GIVEN_NAMES[givenIndex]} ${UNIQUE_CITIZEN_FAMILY_NAMES[familyIndex]}`);
  }
  return names;
})();
