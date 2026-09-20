// Import only the Portuguese catalog as a same-origin asset, never the CDN default.
export async function createEmojiPicker(host) {
  const [{ default: Picker }, { default: dataSource }, { default: i18n }] = await Promise.all([
    import("emoji-picker-element/picker"),
    import("emoji-picker-element-data/pt/cldr/data.json?url"),
    import("emoji-picker-element/i18n/pt_BR"),
  ]);
  if (!host.isConnected) return null;
  const picker = new Picker({ locale: "pt", dataSource, i18n });
  picker.classList.add("light");
  host.appendChild(picker);
  try {
    await picker.database.ready();
    return picker;
  } catch (error) {
    picker.remove();
    throw error;
  }
}
