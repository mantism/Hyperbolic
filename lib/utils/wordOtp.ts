// TODO: Implement this word-based OTP system to replace Supabase's numeric codes
// This would require:
// 1. Custom OTP table in Supabase
// 2. Email service integration (Resend, SendGrid, etc.)
// 3. Backend function to generate and validate OTPs
//
// For now, we're using Supabase's built-in 6-digit numeric OTP

// Simple word list for generating memorable OTPs
const words = [
  // Animals
  "tiger",
  "eagle",
  "whale",
  "panda",
  "zebra",
  "koala",
  "otter",
  "shark",
  "dolphin",
  "rabbit",
  "turtle",
  "parrot",
  "penguin",
  "monkey",
  "elephant",

  // Colors
  "crimson",
  "azure",
  "golden",
  "silver",
  "purple",
  "orange",
  "indigo",
  "coral",

  // Nature
  "forest",
  "ocean",
  "mountain",
  "valley",
  "desert",
  "river",
  "sunset",
  "thunder",
  "rainbow",
  "crystal",
  "meteor",
  "comet",
  "nebula",
  "aurora",
  "glacier",

  // Objects
  "rocket",
  "compass",
  "diamond",
  "puzzle",
  "mirror",
  "anchor",
  "castle",
  "bridge",
  "beacon",
  "lantern",
  "phoenix",
  "dragon",
  "griffin",
  "sphinx",
  "pegasus",

  // Adjectives
  "swift",
  "bright",
  "gentle",
  "mystic",
  "cosmic",
  "ancient",
  "mighty",
  "serene",
  "radiant",
  "vibrant",
  "eternal",
  "hidden",
  "frozen",
  "blazing",
  "soaring",
];

export function generateWordOTP(): string {
  // Generate 4 random words
  const otpWords: string[] = [];
  const usedIndices = new Set<number>();

  while (otpWords.length < 4) {
    const index = Math.floor(Math.random() * words.length);
    if (!usedIndices.has(index)) {
      usedIndices.add(index);
      otpWords.push(words[index]);
    }
  }

  return otpWords.join("-");
}

export function validateOTP(input: string, stored: string): boolean {
  // Case-insensitive comparison, trim whitespace
  return input.trim().toLowerCase() === stored.trim().toLowerCase();
}
