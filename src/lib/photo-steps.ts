// Shared photo steps for the guided capture flow
export interface PhotoStep {
  id: string;
  label: string;
  instruction: string;
  tip: string;
  icon: string;
  required: boolean;
}

export const photoSteps: PhotoStep[] = [
  {
    id: "front-closed",
    label: "Front View (Closed)",
    instruction:
      "Place the laptop closed on a clean surface. Stand directly above and center the laptop in the frame.",
    tip: "Make sure the logo is visible and centered",
    icon: "💻",
    required: true,
  },
  {
    id: "front-open",
    label: "Front View (Open)",
    instruction:
      "Open the laptop at about 110 degrees. Stand above and capture the full keyboard and screen.",
    tip: "Wipe the screen and keyboard first for a clean look",
    icon: "🖥️",
    required: true,
  },
  {
    id: "screen-on",
    label: "Screen Powered On",
    instruction:
      "Turn on the laptop. Show the desktop or a bright wallpaper. Avoid screen glare.",
    tip: "Angle away from windows to prevent reflections",
    icon: "✨",
    required: true,
  },
  {
    id: "keyboard",
    label: "Keyboard Close-up",
    instruction:
      "Get close to the keyboard. Make sure all keys are visible and in focus.",
    tip: "Good lighting is key - use natural light near a window",
    icon: "⌨️",
    required: true,
  },
  {
    id: "ports-left",
    label: "Left Side Ports",
    instruction: "Show the left side of the laptop clearly. All ports should be visible.",
    tip: "Rotate so ports face the camera directly",
    icon: "🔌",
    required: false,
  },
  {
    id: "ports-right",
    label: "Right Side Ports",
    instruction:
      "Show the right side of the laptop. Capture all ports and any vents.",
    tip: "Same angle as the left side for consistency",
    icon: "🔌",
    required: false,
  },
  {
    id: "back",
    label: "Back View",
    instruction:
      "Flip the laptop and show the back/bottom panel. Capture vents and rubber feet.",
    tip: "Place on a soft cloth to avoid scratches",
    icon: "🔄",
    required: false,
  },
  {
    id: "hinge",
    label: "Hinge Detail",
    instruction:
      "Take a close-up of the hinge area. Show if it's loose, tight, or damaged.",
    tip: "Open the lid partially to show hinge tension",
    icon: "🔧",
    required: false,
  },
  {
    id: "damage-front",
    label: "Front Damage (if any)",
    instruction:
      "Photograph any scratches, dents, or marks on the front/lid.",
    tip: "Be honest - buyers appreciate full disclosure",
    icon: "📸",
    required: false,
  },
  {
    id: "damage-palm",
    label: "Palm Rest Damage (if any)",
    instruction:
      "Close-up of the palm rest area. Show any key wear, discoloration, or scratches.",
    tip: "Get close enough that scratches are clearly visible",
    icon: "📸",
    required: false,
  },
  {
    id: "charger",
    label: "Charger & Accessories",
    instruction:
      "Show the charger, cable, and any included accessories (bag, mouse, etc).",
    tip: "Arrange neatly on the same clean surface",
    icon: "🔋",
    required: false,
  },
  {
    id: "box",
    label: "Box & Documentation",
    instruction:
      "If you have the original box, manuals, or receipt - show them here.",
    tip: "Original box adds value - definitely include this if you have it",
    icon: "📦",
    required: false,
  },
];

export const prepTips = [
  { emoji: "🧹", text: "Clean the laptop thoroughly with a microfiber cloth" },
  { emoji: "☀️", text: "Find good natural lighting (near a window)" },
  { emoji: "⬜", text: "Use a clean white or plain background" },
  { emoji: "📱", text: "Wipe your phone camera lens" },
  { emoji: "🔌", text: "Charge the laptop so you can show the screen on" },
  { emoji: "📦", text: "Gather charger, box, and accessories nearby" },
];
