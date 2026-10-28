/** Keep the mirror entry in the sidebar action row, including after React remounts it. */
export function placeUpdateMirrorButton(settingsArea: HTMLElement, button: HTMLButtonElement): void {
  const actions = settingsArea.querySelector<HTMLElement>('[data-dsh-sidebar-settings-actions]') ?? settingsArea
  if (button.parentElement !== actions) actions.appendChild(button)
}
