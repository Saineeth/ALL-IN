import { ChipStack, CHIP_VALUES, getChipTotal } from '../../types/game';

export class ChipManager {
  /**
   * Validates if a player has EXACTLY the requested chip configuration.
   * This enforces the strict "no chip exchange" rule.
   */
  static validateBet(currentChips: ChipStack, betChips: Partial<ChipStack>): boolean {
    const g = betChips.green || 0;
    const b = betChips.blue || 0;
    const r = betChips.red || 0;
    const bl = betChips.black || 0;

    return (
      g <= currentChips.green &&
      b <= currentChips.blue &&
      r <= currentChips.red &&
      bl <= currentChips.black &&
      (g > 0 || b > 0 || r > 0 || bl > 0) // Cannot bet 0
    );
  }

  /**
   * Calculates the exact total amount from the partial chip stack bet.
   */
  static calculateBetAmount(betChips: Partial<ChipStack>): number {
    return (
      (betChips.green || 0) * CHIP_VALUES.green +
      (betChips.blue || 0) * CHIP_VALUES.blue +
      (betChips.red || 0) * CHIP_VALUES.red +
      (betChips.black || 0) * CHIP_VALUES.black
    );
  }

  /**
   * Subtracts bet chips from current stack.
   * Throws if the stack doesn't have enough of the exact chips.
   */
  static deductChips(currentChips: ChipStack, betChips: Partial<ChipStack>): ChipStack {
    if (!this.validateBet(currentChips, betChips)) {
      throw new Error("Invalid bet: insufficient specific chips (No Exchange Rule applies)");
    }

    return {
      green: currentChips.green - (betChips.green || 0),
      blue: currentChips.blue - (betChips.blue || 0),
      red: currentChips.red - (betChips.red || 0),
      black: currentChips.black - (betChips.black || 0),
    };
  }

  /**
   * Automatically determines a valid way to make a given amount using available chips.
   * Uses a greedy approach (largest chips first).
   * Returns null if exact amount cannot be made (due to no exchange rule).
   */
  static autoSelectChipsForBet(currentChips: ChipStack, targetAmount: number): Partial<ChipStack> | null {
    if (targetAmount <= 0) return null;
    if (getChipTotal(currentChips) < targetAmount) return null;

    let remainingAmount = targetAmount;
    const bet: Partial<ChipStack> = { green: 0, blue: 0, red: 0, black: 0 };

    // Try Black (100)
    if (remainingAmount >= CHIP_VALUES.black && currentChips.black > 0) {
      const needed = Math.floor(remainingAmount / CHIP_VALUES.black);
      const use = Math.min(needed, currentChips.black);
      bet.black = use;
      remainingAmount -= use * CHIP_VALUES.black;
    }

    // Try Red (50)
    if (remainingAmount >= CHIP_VALUES.red && currentChips.red > 0) {
      const needed = Math.floor(remainingAmount / CHIP_VALUES.red);
      const use = Math.min(needed, currentChips.red);
      bet.red = use;
      remainingAmount -= use * CHIP_VALUES.red;
    }

    // Try Blue (25)
    if (remainingAmount >= CHIP_VALUES.blue && currentChips.blue > 0) {
      const needed = Math.floor(remainingAmount / CHIP_VALUES.blue);
      const use = Math.min(needed, currentChips.blue);
      bet.blue = use;
      remainingAmount -= use * CHIP_VALUES.blue;
    }

    // Try Green (10)
    if (remainingAmount >= CHIP_VALUES.green && currentChips.green > 0) {
      const needed = Math.floor(remainingAmount / CHIP_VALUES.green);
      const use = Math.min(needed, currentChips.green);
      bet.green = use;
      remainingAmount -= use * CHIP_VALUES.green;
    }

    // If we exactly hit the amount, return the combination
    if (remainingAmount === 0) {
      return bet;
    }

    // If greedy fails, exact match is impossible with current chips
    return null;
  }

  /**
   * Finds the minimum possible bet greater than 0 based on the smallest chip the player holds.
   * "If a player has only Black Chips remaining, their minimum possible bet is 100 points."
   */
  static getMinimumPossibleBet(chips: ChipStack): number {
    if (chips.green > 0) return CHIP_VALUES.green; // 10
    if (chips.blue > 0) return CHIP_VALUES.blue;   // 25
    if (chips.red > 0) return CHIP_VALUES.red;     // 50
    if (chips.black > 0) return CHIP_VALUES.black; // 100
    return 0; // All in / empty
  }

  /**
   * Converts a chip amount into a ChipStack using largest denominations first.
   * Used when awarding pot winnings to a player.
   */
  static convertAmountToChips(amount: number): ChipStack {
    let remaining = amount;
    const chips: ChipStack = { green: 0, blue: 0, red: 0, black: 0 };
    
    chips.black = Math.floor(remaining / CHIP_VALUES.black);
    remaining %= CHIP_VALUES.black;
    chips.red = Math.floor(remaining / CHIP_VALUES.red);
    remaining %= CHIP_VALUES.red;
    chips.blue = Math.floor(remaining / CHIP_VALUES.blue);
    remaining %= CHIP_VALUES.blue;
    chips.green = Math.floor(remaining / CHIP_VALUES.green);
    remaining %= CHIP_VALUES.green;
    
    // Remainder < 10 gets rounded up to 1 green chip
    if (remaining > 0) chips.green += 1;
    
    return chips;
  }

  /**
   * Adds two chip stacks together.
   */
  static addChips(current: ChipStack, addition: ChipStack): ChipStack {
    return {
      green: current.green + addition.green,
      blue: current.blue + addition.blue,
      red: current.red + addition.red,
      black: current.black + addition.black,
    };
  }
}
