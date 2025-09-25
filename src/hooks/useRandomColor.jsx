export default function useRandomColor(id) {
	const hue = (parseInt(id) * 137) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}
