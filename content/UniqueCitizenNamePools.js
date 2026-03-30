// Unique citizens draw from a curated pool of 300 fantasy-oriented full names.
// The given/family pieces stay editable so more names can be generated later.
export const UNIQUE_CITIZEN_GIVEN_NAMES = [
  "Aelric","Aelwen","Aerin","Aldren","Althaea","Alric","Amarys","Anwyn","Aric","Arianne",
  "Arlen","Armina","Arthen","Aster","Aveline","Bastian","Belthar","Brenna","Brennor","Briseis",
  "Brynden","Caelan","Caelric","Caelys","Calista","Cassian","Cedren","Cerys","Corwin","Cyrene",
  "Daelor","Dain","Damaris","Delphine","Dorian","Draeven","Edrin","Eirwen","Elaria","Elowen",
  "Emrys","Endric","Eryndor","Evania","Evander","Faelan","Faelynn","Fenric","Fenra","Fintan",
  "Fiora","Galen","Garrick","Gavriel","Gwyneira","Halric","Heliora","Heron","Hestia","Idris",
  "Ilyra","Iseult","Isolde","Ivor","Jareth","Jessamine","Jorren","Jorvik","Kael","Kaelen",
  "Kaelora","Kaida","Kellan","Kerensa","Kestrel","Korren","Leander","Leoric","Liora","Lirael",
  "Lorcan","Lucan","Lucien","Luneth","Lysandra","Lysandor","Maelis","Mairen","Malric","Marrok",
  "Mavric","Melian","Meridia","Mireth","Mirelle","Morwen","Myrren","Naevys","Nerisse","Nerys",
  "Nuala","Nymera","Nyra","Nyssara","Oberon","Odran","Oren","Oriana","Orik","Orlian",
  "Osric","Paloma","Percival","Phaedra","Quenara","Quillan","Quorin","Raelor","Rhiannon","Riven",
  "Roderic","Ronan","Roswyn","Rowen","Sable","Selene","Selvara","Seraphine","Siora","Sorrel",
  "Sorin","Sylra","Sylvara","Taliah","Tarian","Tavian","Thalen","Thamira","Theron","Thessa",
  "Torin","Torven","Trystan","Ulric","Uthric","Vaelin","Vaessa","Valessa","Varen","Vespera",
  "Veyla","Vireya","Wren","Wystan","Xavian","Xyra","Yara","Ysolde","Ysella","Zephyra"
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

export const UNIQUE_CITIZEN_FULL_NAMES = (() => {
  const names = [];
  for (const givenName of UNIQUE_CITIZEN_GIVEN_NAMES) {
    for (const familyName of UNIQUE_CITIZEN_FAMILY_NAMES) {
      names.push(`${givenName} ${familyName}`);
      if (names.length >= 300) {
        return names;
      }
    }
  }
  return names;
})();
