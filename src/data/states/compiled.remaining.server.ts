/**
 * Compiled remaining overlays. Shape matches Tennessee: [top, mid, cash].
 */
import type { RemainingRow } from "./compile";
import { EXTRA_COMPILED_REMAINING } from "./compiled.remaining.extra.server";
import { FIVE_COMPILED_REMAINING } from "./compiled.remaining.five.server";

export const COMPILED_REMAINING: Record<
  | "ky"
  | "sc"
  | "ok"
  | "mi"
  | "az"
  | "nc"
  | "pa"
  | "tx"
  | "mo"
  | "oh"
  | "il"
  | "ma"
  | "ia"
  | "id"
  | "ct",
  Record<number, RemainingRow>
> = {
  ky: {
    105: [2, 44, 67],
    107: [0, 5, 17],
    108: [1, 0, 61],
    109: [0, 3, 10],
    112: [1, 59, 1463],
    113: [1, 97, 182],
    114: [977, 1403, 22453],
    115: [4, 1, 592],
    116: [1, 6, 55],
    117: [3, 110, 225],
    118: [2, 1, 464],
    119: [0, 4, 32],
    121: [2, 60, 117],
    122: [2, 2, 1314],
    125: [2, 64, 326],
    126: [1, 4, 468],
    127: [0, 4, 64],
    130: [4, 138, 321],
    131: [1, 61, 301],
    132: [832, 1215, 5191],
    133: [0, 19, 248],
    136: [4241, 3749, 29116],
    137: [3, 394, 568],
    138: [2, 5, 994],
    141: [3, 672, 645],
    142: [1, 206, 131],
    150: [3, 16, 770],
    151: [3, 21, 484],
    152: [3, 21, 328],
    153: [3, 141, 537],
    555: [1, 20, 44],
    712: [0, 8, 23],
    714: [1, 28, 2478],
    746: [3, 9, 903],
    747: [2, 9, 1259],
    757: [2, 31, 23457],
    761: [1, 20, 15641],
    779: [1, 2, 40],
    792: [2, 0, 31],
    793: [1, 4, 172],
    806: [1, 3, 483],
    831: [1, 4, 120],
    832: [2, 39, 992],
    833: [1, 124, 493],
    841: [2, 1610, 3875],
    848: [1, 8, 351],
    868: [1, 17, 21],
    870: [1, 1512, 1360],
    930: [90, 139, 524],
    935: [0, 18, 33],
    936: [1, 22, 509],
    941: [27, 112, 1055],
    944: [459, 3087, 9210],
    966: [1, 12, 43],
    967: [1, 0, 11],
    968: [0, 4, 22],
    969: [0, 0, 4],
    971: [0, 13, 15],
    973: [2992, 19056, 95412],
    975: [1, 16, 152],
    977: [0, 3, 3],
    978: [0, 0, 196],
    979: [0, 0, 0],
    980: [2395, 6748, 9553],
    983: [0, 11, 32],
    984: [1, 10, 46],
    987: [0, 6, 51],
    988: [1, 0, 3],
    989: [0, 2, 48],
    990: [0, 1, 573],
    991: [0, 23, 46],
    994: [9, 38, 629],
    995: [0, 9, 25],
    996: [0, 13, 21],
    997: [2, 14, 83],
    998: [15, 46, 75]
  },
  sc: {
    1618: [2, 80, 701],
    1653: [1, 6, 13],
    1658: [1, 7, 166],
    1660: [541, 3077, 30792],
    1665: [1, 1, 163],
    1668: [1, 25, 78],
    1669: [4, 25, 559],
    1671: [12339, 5482, 69355],
    1673: [3, 3, 70],
    1674: [2, 15, 70],
    1679: [2, 54, 317],
    1680: [1, 19, 723],
    1683: [7, 12, 9199],
    1684: [29233, 2820, 15783],
    1688: [4, 227, 622],
    1689: [2, 46, 1290],
    1690: [4, 155, 586],
    1691: [4, 44, 1771],
    1692: [4, 3, 523],
    1699: [6, 54, 386]
  },
  ok: {
    637: [2, 2, 1917],
    761: [356, 49, 1030],
    769: [1, 2, 7],
    779: [2, 2, 1],
    795: [0, 5, 4],
    802: [2, 1, 10],
    805: [1, 1, 1],
    806: [1, 5, 19],
    814: [1, 1, 88],
    815: [2, 1, 99],
    820: [222, 51, 28],
    825: [1, 1, 2],
    826: [2, 3, 3],
    829: [1, 6, 19],
    830: [1, 1, 4],
    833: [2, 3, 2],
    834: [2, 2, 5],
    837: [2, 38, 92],
    841: [3, 4, 10],
    842: [2, 5, 244],
    843: [2, 3, 10],
    846: [2, 40, 49],
    848: [3, 9, 13],
    851: [3, 12, 18],
    854: [3, 17, 23],
    855: [3, 4, 81]
  },
  mi: {
    600: [2, 559, 1228],
    630: [1, 1, 1627],
    640: [2, 18, 34],
    643: [2, 15, 76],
    648: [1, 13, 193],
    677: [3, 631, 2348],
    683: [1, 1, 17],
    691: [2, 3, 52],
    693: [1, 11, 21],
    694: [2, 29, 82],
    695: [2, 36, 2208],
    706: [2, 19, 453],
    709: [18085, 85778, 266768],
    719: [2, 13, 9630],
    755: [3, 17, 544],
    757: [3, 40, 202],
    758: [3, 9, 111],
    759: [3, 13, 193],
    764: [3, 1217, 2729]
  },
  az: {
    1401: [2, null, null],
    1444: [2, null, null],
    1479: [1, null, null],
    1480: [2, null, null],
    1489: [5, null, null],
    1496: [4, null, null],
    1497: [4, null, null],
    1502: [1, null, null],
    1508: [7, null, null],
    1512: [1, null, null],
    1515: [2, null, null],
    1520: [2, null, null],
    1521: [4, null, null],
    1522: [4, null, null],
    1523: [3, null, null],
    1530: [15, null, null],
    1537: [2, null, null],
    1545: [9, null, null],
    1549: [4, null, null]
  },
  ...EXTRA_COMPILED_REMAINING,
  ...FIVE_COMPILED_REMAINING,
};

export const KY_REMAINING = COMPILED_REMAINING.ky;
export const SC_REMAINING = COMPILED_REMAINING.sc;
export const OK_REMAINING = COMPILED_REMAINING.ok;
export const MI_REMAINING = COMPILED_REMAINING.mi;
export const AZ_REMAINING = COMPILED_REMAINING.az;
export const NC_REMAINING = COMPILED_REMAINING.nc;
export const PA_REMAINING = COMPILED_REMAINING.pa;
export const TX_REMAINING = COMPILED_REMAINING.tx;
export const MO_REMAINING = COMPILED_REMAINING.mo;
export const OH_REMAINING = COMPILED_REMAINING.oh;
export const IL_REMAINING = COMPILED_REMAINING.il;
export const MA_REMAINING = COMPILED_REMAINING.ma;
export const IA_REMAINING = COMPILED_REMAINING.ia;
export const ID_REMAINING = COMPILED_REMAINING.id;
export const CT_REMAINING = COMPILED_REMAINING.ct;
