/**
 * Double Metaphone Algorithm — TypeScript implementation.
 *
 * Returns [primary, alternate] phonetic codes for a given word.
 * Based on Lawrence Philips' Double Metaphone algorithm.
 *
 * This is a full, production-grade implementation covering:
 * - Germanic, Slavic, Romance language origins
 * - Silent letters, digraphs, special consonant clusters
 * - Vowel handling (only coded at start of word)
 */

export function doubleMetaphone(input: string): [string, string] {
  if (!input || input.length === 0) return ['', ''];

  const maxLength = 4;
  let primary = '';
  let secondary = '';
  let current = 0;

  const original = input.toUpperCase() + '     ';
  const length = input.length;
  let last = length - 1;

  const isSlavoGermanic =
    original.includes('W') ||
    original.includes('K') ||
    original.includes('CZ') ||
    original.includes('WITZ');

  function stringAt(start: number, len: number, list: string[]): boolean {
    if (start < 0) return false;
    const target = original.substring(start, start + len);
    return list.includes(target);
  }

  function isVowel(at: number): boolean {
    return ['A', 'E', 'I', 'O', 'U', 'Y'].includes(original[at]);
  }

  // skip non-alpha prefix
  if (stringAt(0, 2, ['GN', 'KN', 'PN', 'AE', 'WR'])) {
    current += 1;
  }

  // initial X -> S
  if (original[0] === 'X') {
    primary += 'S';
    secondary += 'S';
    current += 1;
  }

  while (primary.length < maxLength || secondary.length < maxLength) {
    if (current >= length) break;

    const ch = original[current];

    switch (ch) {
      case 'A':
      case 'E':
      case 'I':
      case 'O':
      case 'U':
      case 'Y':
        if (current === 0) {
          primary += 'A';
          secondary += 'A';
        }
        current += 1;
        break;

      case 'B':
        primary += 'P';
        secondary += 'P';
        current += original[current + 1] === 'B' ? 2 : 1;
        break;

      case 'Ç':
        primary += 'S';
        secondary += 'S';
        current += 1;
        break;

      case 'C':
        // various germanic
        if (
          current > 1 &&
          !isVowel(current - 2) &&
          stringAt(current - 1, 3, ['ACH']) &&
          original[current + 2] !== 'I' &&
          (original[current + 2] !== 'E' ||
            stringAt(current - 2, 6, ['BACHER', 'MACHER']))
        ) {
          primary += 'K';
          secondary += 'K';
          current += 2;
          break;
        }

        // special case 'caesar'
        if (current === 0 && stringAt(current, 6, ['CAESAR'])) {
          primary += 'S';
          secondary += 'S';
          current += 2;
          break;
        }

        // 'ch'
        if (stringAt(current, 2, ['CH'])) {
          // italian 'chianti'
          if (current > 0 && stringAt(current, 4, ['CHIA'])) {
            primary += 'K';
            secondary += 'K';
            current += 2;
            break;
          }

          if (
            current === 0 &&
            (stringAt(current + 1, 5, ['HARAC', 'HARIS']) ||
              stringAt(current + 1, 3, ['HOR', 'HYM', 'HIA', 'HEM'])) &&
            !stringAt(0, 5, ['CHORE'])
          ) {
            primary += 'K';
            secondary += 'K';
            current += 2;
            break;
          }

          if (
            stringAt(0, 4, ['VAN ', 'VON ']) ||
            stringAt(0, 3, ['SCH']) ||
            stringAt(current - 2, 6, ['ORCHES', 'ARCHIT', 'ORCHID']) ||
            stringAt(current + 2, 1, ['T', 'S']) ||
            ((stringAt(current - 1, 1, ['A', 'O', 'U', 'E']) ||
              current === 0) &&
              stringAt(current + 2, 1, [
                'L',
                'R',
                'N',
                'M',
                'B',
                'H',
                'F',
                'V',
                'W',
                ' ',
              ]))
          ) {
            primary += 'K';
            secondary += 'K';
          } else {
            if (current > 0) {
              if (stringAt(0, 2, ['MC'])) {
                primary += 'K';
                secondary += 'K';
              } else {
                primary += 'X';
                secondary += 'K';
              }
            } else {
              primary += 'X';
              secondary += 'X';
            }
          }
          current += 2;
          break;
        }

        if (
          stringAt(current, 2, ['CZ']) &&
          !stringAt(current - 2, 4, ['WICZ'])
        ) {
          primary += 'S';
          secondary += 'X';
          current += 2;
          break;
        }

        if (stringAt(current + 1, 3, ['CIA'])) {
          primary += 'X';
          secondary += 'X';
          current += 3;
          break;
        }

        if (
          stringAt(current, 2, ['CC']) &&
          !(current === 1 && original[0] === 'M')
        ) {
          if (
            stringAt(current + 2, 1, ['I', 'E', 'H']) &&
            !stringAt(current + 2, 2, ['HU'])
          ) {
            if (
              (current === 1 && original[current - 1] === 'A') ||
              stringAt(current - 1, 5, ['UCCEE', 'UCCES'])
            ) {
              primary += 'KS';
              secondary += 'KS';
            } else {
              primary += 'X';
              secondary += 'X';
            }
            current += 3;
            break;
          } else {
            primary += 'K';
            secondary += 'K';
            current += 2;
            break;
          }
        }

        if (stringAt(current, 2, ['CK', 'CG', 'CQ'])) {
          primary += 'K';
          secondary += 'K';
          current += 2;
          break;
        }

        if (stringAt(current, 2, ['CI', 'CE', 'CY'])) {
          if (stringAt(current, 3, ['CIO', 'CIE', 'CIA'])) {
            primary += 'S';
            secondary += 'X';
          } else {
            primary += 'S';
            secondary += 'S';
          }
          current += 2;
          break;
        }

        primary += 'K';
        secondary += 'K';

        if (stringAt(current + 1, 2, [' C', ' Q', ' G'])) {
          current += 3;
        } else if (
          stringAt(current + 1, 1, ['C', 'K', 'Q']) &&
          !stringAt(current + 1, 2, ['CE', 'CI'])
        ) {
          current += 2;
        } else {
          current += 1;
        }
        break;

      case 'D':
        if (stringAt(current, 2, ['DG'])) {
          if (stringAt(current + 2, 1, ['I', 'E', 'Y'])) {
            primary += 'J';
            secondary += 'J';
            current += 3;
            break;
          } else {
            primary += 'TK';
            secondary += 'TK';
            current += 2;
            break;
          }
        }

        if (stringAt(current, 2, ['DT', 'DD'])) {
          primary += 'T';
          secondary += 'T';
          current += 2;
          break;
        }

        primary += 'T';
        secondary += 'T';
        current += 1;
        break;

      case 'F':
        primary += 'F';
        secondary += 'F';
        current += original[current + 1] === 'F' ? 2 : 1;
        break;

      case 'G':
        if (original[current + 1] === 'H') {
          if (current > 0 && !isVowel(current - 1)) {
            primary += 'K';
            secondary += 'K';
            current += 2;
            break;
          }

          if (current === 0) {
            if (original[current + 2] === 'I') {
              primary += 'J';
              secondary += 'J';
            } else {
              primary += 'K';
              secondary += 'K';
            }
            current += 2;
            break;
          }

          if (
            (current > 1 && stringAt(current - 2, 1, ['B', 'H', 'D'])) ||
            (current > 2 && stringAt(current - 3, 1, ['B', 'H', 'D'])) ||
            (current > 3 && stringAt(current - 4, 1, ['B', 'H']))
          ) {
            current += 2;
            break;
          } else {
            if (
              current > 2 &&
              original[current - 1] === 'U' &&
              stringAt(current - 3, 1, ['C', 'G', 'L', 'R', 'T'])
            ) {
              primary += 'F';
              secondary += 'F';
            } else if (current > 0 && original[current - 1] !== 'I') {
              primary += 'K';
              secondary += 'K';
            }
            current += 2;
            break;
          }
        }

        if (original[current + 1] === 'N') {
          if (
            current === 1 &&
            isVowel(0) &&
            !isSlavoGermanic
          ) {
            primary += 'KN';
            secondary += 'N';
          } else {
            if (
              !stringAt(current + 2, 2, ['EY']) &&
              original[current + 1] !== 'Y' &&
              !isSlavoGermanic
            ) {
              primary += 'N';
              secondary += 'KN';
            } else {
              primary += 'KN';
              secondary += 'KN';
            }
          }
          current += 2;
          break;
        }

        if (
          stringAt(current + 1, 2, ['LI']) &&
          !isSlavoGermanic
        ) {
          primary += 'KL';
          secondary += 'L';
          current += 2;
          break;
        }

        if (
          current === 0 &&
          (original[current + 1] === 'Y' ||
            stringAt(current + 1, 2, [
              'ES',
              'EP',
              'EB',
              'EL',
              'EY',
              'IB',
              'IL',
              'IN',
              'IE',
              'EI',
              'ER',
            ]))
        ) {
          primary += 'K';
          secondary += 'J';
          current += 2;
          break;
        }

        if (
          (stringAt(current + 1, 2, ['ER']) ||
            original[current + 1] === 'Y') &&
          !stringAt(0, 6, ['DANGER', 'RANGER', 'MANGER']) &&
          !stringAt(current - 1, 1, ['E', 'I']) &&
          !stringAt(current - 1, 3, ['RGY', 'OGY'])
        ) {
          primary += 'K';
          secondary += 'J';
          current += 2;
          break;
        }

        if (
          stringAt(current + 1, 1, ['E', 'I', 'Y']) ||
          stringAt(current - 1, 4, ['AGGI', 'OGGI'])
        ) {
          if (
            stringAt(0, 4, ['VAN ', 'VON ']) ||
            stringAt(0, 3, ['SCH']) ||
            stringAt(current + 1, 2, ['ET'])
          ) {
            primary += 'K';
            secondary += 'K';
          } else {
            if (stringAt(current + 1, 4, ['IER '])) {
              primary += 'J';
              secondary += 'J';
            } else {
              primary += 'J';
              secondary += 'K';
            }
          }
          current += 2;
          break;
        }

        primary += 'K';
        secondary += 'K';
        current += original[current + 1] === 'G' ? 2 : 1;
        break;

      case 'H':
        if ((current === 0 || isVowel(current - 1)) && isVowel(current + 1)) {
          primary += 'H';
          secondary += 'H';
          current += 2;
        } else {
          current += 1;
        }
        break;

      case 'J':
        if (
          stringAt(current, 4, ['JOSE']) ||
          stringAt(0, 4, ['SAN '])
        ) {
          if (
            (current === 0 && original[current + 4] === ' ') ||
            stringAt(0, 4, ['SAN '])
          ) {
            primary += 'H';
            secondary += 'H';
          } else {
            primary += 'J';
            secondary += 'H';
          }
          current += 1;
          break;
        }

        if (current === 0 && !stringAt(current, 4, ['JOSE'])) {
          primary += 'J';
          secondary += 'A';
        } else {
          if (
            isVowel(current - 1) &&
            !isSlavoGermanic &&
            (original[current + 1] === 'A' || original[current + 1] === 'O')
          ) {
            primary += 'J';
            secondary += 'H';
          } else if (current === last) {
            primary += 'J';
            secondary += '';
          } else if (
            !stringAt(current + 1, 1, [
              'L',
              'T',
              'K',
              'S',
              'N',
              'M',
              'B',
              'H',
              'F',
              'V',
              'W',
              'Z',
            ]) &&
            !stringAt(current - 1, 1, ['S', 'K', 'L'])
          ) {
            primary += 'J';
            secondary += 'J';
          }
        }

        current += original[current + 1] === 'J' ? 2 : 1;
        break;

      case 'K':
        primary += 'K';
        secondary += 'K';
        current += original[current + 1] === 'K' ? 2 : 1;
        break;

      case 'L':
        if (original[current + 1] === 'L') {
          if (
            (current === length - 3 &&
              stringAt(current - 1, 4, ['ILLO', 'ILLA', 'ALLE'])) ||
            ((stringAt(last - 1, 2, ['AS', 'OS']) ||
              stringAt(last, 1, ['A', 'O'])) &&
              stringAt(current - 1, 4, ['ALLE']))
          ) {
            primary += 'L';
            secondary += '';
            current += 2;
            break;
          }
          primary += 'L';
          secondary += 'L';
          current += 2;
        } else {
          primary += 'L';
          secondary += 'L';
          current += 1;
        }
        break;

      case 'M':
        primary += 'M';
        secondary += 'M';
        if (
          stringAt(current - 1, 3, ['UMB']) &&
          (current + 1 === last || stringAt(current + 2, 2, ['ER']))
        ) {
          current += 2;
        } else {
          current += original[current + 1] === 'M' ? 2 : 1;
        }
        break;

      case 'N':
        primary += 'N';
        secondary += 'N';
        current += original[current + 1] === 'N' ? 2 : 1;
        break;

      case 'Ñ':
        primary += 'N';
        secondary += 'N';
        current += 1;
        break;

      case 'P':
        if (original[current + 1] === 'H') {
          primary += 'F';
          secondary += 'F';
          current += 2;
          break;
        }
        primary += 'P';
        secondary += 'P';
        current += stringAt(current + 1, 1, ['P', 'B']) ? 2 : 1;
        break;

      case 'Q':
        primary += 'K';
        secondary += 'K';
        current += original[current + 1] === 'Q' ? 2 : 1;
        break;

      case 'R':
        if (
          current === last &&
          !isSlavoGermanic &&
          stringAt(current - 2, 2, ['IE']) &&
          !stringAt(current - 4, 2, ['ME', 'MA'])
        ) {
          primary += '';
          secondary += 'R';
        } else {
          primary += 'R';
          secondary += 'R';
        }
        current += original[current + 1] === 'R' ? 2 : 1;
        break;

      case 'S':
        if (stringAt(current - 1, 3, ['ISL', 'YSL'])) {
          current += 1;
          break;
        }

        if (current === 0 && stringAt(current, 5, ['SUGAR'])) {
          primary += 'X';
          secondary += 'S';
          current += 1;
          break;
        }

        if (stringAt(current, 2, ['SH'])) {
          if (stringAt(current + 1, 4, ['HEIM', 'HOEK', 'HOLM', 'HOLZ'])) {
            primary += 'S';
            secondary += 'S';
          } else {
            primary += 'X';
            secondary += 'X';
          }
          current += 2;
          break;
        }

        if (
          stringAt(current, 3, ['SIO', 'SIA']) ||
          stringAt(current, 4, ['SIAN'])
        ) {
          if (!isSlavoGermanic) {
            primary += 'S';
            secondary += 'X';
          } else {
            primary += 'S';
            secondary += 'S';
          }
          current += 3;
          break;
        }

        if (
          (current === 0 && stringAt(current + 1, 1, ['M', 'N', 'L', 'W'])) ||
          stringAt(current + 1, 1, ['Z'])
        ) {
          primary += 'S';
          secondary += 'X';
          current += stringAt(current + 1, 1, ['Z']) ? 2 : 1;
          break;
        }

        if (stringAt(current, 2, ['SC'])) {
          if (original[current + 2] === 'H') {
            if (stringAt(current + 3, 2, ['OO', 'ER', 'EN', 'UY', 'ED', 'EM'])) {
              if (stringAt(current + 3, 2, ['ER', 'EN'])) {
                primary += 'X';
                secondary += 'SK';
              } else {
                primary += 'SK';
                secondary += 'SK';
              }
              current += 3;
              break;
            } else {
              if (
                current === 0 &&
                !isVowel(3) &&
                original[3] !== 'W'
              ) {
                primary += 'X';
                secondary += 'S';
              } else {
                primary += 'X';
                secondary += 'X';
              }
              current += 3;
              break;
            }
          }

          if (stringAt(current + 2, 1, ['I', 'E', 'Y'])) {
            primary += 'S';
            secondary += 'S';
            current += 3;
            break;
          }

          primary += 'SK';
          secondary += 'SK';
          current += 3;
          break;
        }

        if (
          current === last &&
          stringAt(current - 2, 2, ['AI', 'OI'])
        ) {
          primary += '';
          secondary += 'S';
        } else {
          primary += 'S';
          secondary += 'S';
        }

        current += stringAt(current + 1, 1, ['S', 'Z']) ? 2 : 1;
        break;

      case 'T':
        if (stringAt(current, 4, ['TION'])) {
          primary += 'X';
          secondary += 'X';
          current += 3;
          break;
        }

        if (stringAt(current, 3, ['TIA', 'TCH'])) {
          primary += 'X';
          secondary += 'X';
          current += 3;
          break;
        }

        if (
          stringAt(current, 2, ['TH']) ||
          stringAt(current, 3, ['TTH'])
        ) {
          if (
            stringAt(current + 2, 2, ['OM', 'AM']) ||
            stringAt(0, 4, ['VAN ', 'VON ']) ||
            stringAt(0, 3, ['SCH'])
          ) {
            primary += 'T';
            secondary += 'T';
          } else {
            primary += '0';
            secondary += 'T';
          }
          current += 2;
          break;
        }

        primary += 'T';
        secondary += 'T';
        current += stringAt(current + 1, 1, ['T', 'D']) ? 2 : 1;
        break;

      case 'V':
        primary += 'F';
        secondary += 'F';
        current += original[current + 1] === 'V' ? 2 : 1;
        break;

      case 'W':
        if (original[current + 1] === 'R') {
          primary += 'R';
          secondary += 'R';
          current += 2;
          break;
        }

        if (current === 0) {
          if (isVowel(current + 1)) {
            primary += 'A';
            secondary += 'F';
          } else if (stringAt(current, 2, ['WH'])) {
            primary += 'A';
            secondary += 'A';
          }
        }

        if (
          (current === last && isVowel(current - 1)) ||
          stringAt(current - 1, 5, [
            'EWSKI',
            'EWSKY',
            'OWSKI',
            'OWSKY',
          ]) ||
          stringAt(0, 3, ['SCH'])
        ) {
          primary += '';
          secondary += 'F';
          current += 1;
          break;
        }

        if (stringAt(current, 4, ['WICZ', 'WITZ'])) {
          primary += 'TS';
          secondary += 'FX';
          current += 4;
          break;
        }

        current += 1;
        break;

      case 'X':
        if (
          !(
            current === last &&
            (stringAt(current - 3, 3, ['IAU', 'EAU']) ||
              stringAt(current - 2, 2, ['AU', 'OU']))
          )
        ) {
          primary += 'KS';
          secondary += 'KS';
        }
        current += stringAt(current + 1, 1, ['C', 'X']) ? 2 : 1;
        break;

      case 'Z':
        if (original[current + 1] === 'H') {
          primary += 'J';
          secondary += 'J';
          current += 2;
          break;
        } else if (
          stringAt(current + 1, 2, ['ZO', 'ZI', 'ZA']) ||
          (isSlavoGermanic &&
            current > 0 &&
            original[current - 1] !== 'T')
        ) {
          primary += 'S';
          secondary += 'TS';
        } else {
          primary += 'S';
          secondary += 'S';
        }
        current += original[current + 1] === 'Z' ? 2 : 1;
        break;

      default:
        current += 1;
        break;
    }
  }

  return [
    primary.substring(0, maxLength),
    secondary.substring(0, maxLength),
  ];
}
