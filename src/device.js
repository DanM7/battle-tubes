// Phones and tablets: a finger is the primary pointer. They get on-screen controls and a
// play area raised above them. Touchscreen laptops count as desktop (mouse first), but
// touching the screen there still brings up the controls.
export const IS_MOBILE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
