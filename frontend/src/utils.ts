export const lightenColor = (color: string, factor: number) => {
  // Extract RGB components from hex
  let r, g, b;

  if (color.startsWith("#")) {
    r = parseInt(color.slice(1, 3), 16);
    g = parseInt(color.slice(3, 5), 16);
    b = parseInt(color.slice(5, 7), 16);
  } else {
    // For predefined colors, use a default lighter shade
    return lightenPredefinedColor(color);
  }

  // Lighten by the factor
  r = Math.min(255, Math.floor(r + (255 - r) * factor));
  g = Math.min(255, Math.floor(g + (255 - g) * factor));
  b = Math.min(255, Math.floor(b + (255 - b) * factor));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

export const lightenPredefinedColor = (color: string) => {
  // Lighter versions of the predefined pastel colors
  const colorMap: { [key: string]: string } = {
    "#FF9AA2": "#FFD1D6",
    "#FFB7B2": "#FFE1DE",
    "#FFDAC1": "#FFF0E3",
    "#E2F0CB": "#F1F9E5",
    "#B5EAD7": "#DAFAEE",
    "#C7CEEA": "#E3E8F7",
  };

  return colorMap[color] || "#FFFFFF";
};

export const getRandomColor = () => {
  const colors = [
    "#FF9AA2",
    "#FFB7B2",
    "#FFDAC1",
    "#E2F0CB",
    "#B5EAD7",
    "#C7CEEA",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};
