// Gender / build / hair choices for custom riders (no Phaser). Used by customRiders,
// customCode, and riderArt.

export const BUILDS = ['skinny', 'normal', 'chubby', 'fat', 'huge'];
export const GENDERS = ['boy', 'girl'];
export const HAIR_STYLES = {
  boy: ['classic', 'spiky', 'buzz', 'crop', 'mohawk', 'long', 'curly'],
  girl: ['ponytail', 'ponytail-no-bangs'],
};

// Boy hair styles that reuse another strip until their own art ships (curly → long).
export const HAIR_ANIM_ALIAS = { curly: 'long' };

export const hairStyleLabel = (style) => style.replaceAll('-', ' ').toUpperCase();

export const genderBuilds = (gender) => (gender === 'girl' ? ['normal'] : BUILDS);
