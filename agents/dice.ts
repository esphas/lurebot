import { Command } from "../agent/command";

export const commands = [
  {
    event: "message",
    permission: "chat",
    name: "r",
    pattern:
      "((?:(?:\\d+\\s*)?d\\s*)?\\d+)((?:\\s*[+-]\\s*(?:(?:\\d+\\s*)?d\\s*)?\\d+)*)",
    handler: async (context, match) => {
      const first = match![1];
      const rest = match![2].trim();
      let sum = 0;
      let result = "";
      if (first.includes("d")) {
        const [count, face] = first.split("d");
        const diceResult = rollDice(Number(count) || 1, Number(face));
        sum += diceResult;
        result += `${Number(count) || 1}d${Number(face)}(${diceResult})`;
      } else {
        const diceResult = rollDice(1, Number(first));
        sum += diceResult;
        result += `1d${Number(first)}(${diceResult})`;
      }
      for (const dice of rest.matchAll(/([+-])\s*(?:(\d+\s*)?(d)\s*)?(\d+)/g)) {
        const sign = dice[1] === "+" ? 1 : -1;
        const count = Number(dice[2]) || 1;
        const d = dice[3];
        const face = Number(dice[4]);
        if (d === "d") {
          const diceResult = rollDice(count, face);
          sum += sign * diceResult;
          result += `${dice[1]}${count}d${face}(${diceResult})`;
        } else {
          const diceResult = face;
          sum += sign * diceResult;
          result += `${dice[1]}${face}(${diceResult})`;
        }
      }
      result += ` = ${sum}`;
      await context.reply(result);
    },
  } as Command<"message">,
] as Command[];

const rollDice = (count: number, face: number) => {
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(Math.floor(Math.random() * face) + 1);
  }
  return results.reduce((a, b) => a + b, 0);
};
