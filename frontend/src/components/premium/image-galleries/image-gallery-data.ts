export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  label?: string;
  location?: string;
  aspectRatio?: number;
};

export const IMAGE_GALLERY_IMAGES: GalleryImage[] = [
  {
    id: 'coastal-house',
    src: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&fm=webp&q=84&w=900',
    alt: 'Sunlit living room overlooking the coast',
    label: 'Coastal house',
    location: 'Morning light',
    aspectRatio: 0.78,
  },
  {
    id: 'stone-detail',
    src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&fm=webp&q=84&w=900',
    alt: 'Sculptural stone interior detail',
    label: 'Stone study',
    location: 'Material archive',
    aspectRatio: 1.08,
  },
  {
    id: 'quiet-studio',
    src: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&fm=webp&q=84&w=900',
    alt: 'Quiet creative studio with long worktables',
    label: 'The long room',
    location: 'Working studio',
    aspectRatio: 0.84,
  },
  {
    id: 'warm-courtyard',
    src: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&fm=webp&q=84&w=900',
    alt: 'Warm modern courtyard framed by timber',
    label: 'Inner court',
    location: 'Late afternoon',
    aspectRatio: 0.72,
  },
  {
    id: 'gallery-light',
    src: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&fm=webp&q=84&w=900',
    alt: 'Minimal gallery room washed in natural light',
    label: 'White gallery',
    location: 'Natural light',
    aspectRatio: 1.12,
  },
  {
    id: 'linen-room',
    src: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&fm=webp&q=84&w=900',
    alt: 'Calm bedroom layered with natural linen',
    label: 'Linen room',
    location: 'Quiet collection',
    aspectRatio: 0.8,
  },
  {
    id: 'concrete-stair',
    src: 'https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&fm=webp&q=84&w=900',
    alt: 'Curved concrete stair in a quiet interior',
    label: 'Soft concrete',
    location: 'Circulation study',
    aspectRatio: 0.7,
  },
  {
    id: 'terrace',
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&fm=webp&q=84&w=900',
    alt: 'Modern home opening onto a green terrace',
    label: 'Open terrace',
    location: 'Garden edge',
    aspectRatio: 1.05,
  },
  {
    id: 'oak-kitchen',
    src: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&fm=webp&q=84&w=900',
    alt: 'Oak kitchen with a restrained material palette',
    label: 'Oak kitchen',
    location: 'Material study',
    aspectRatio: 0.76,
  },
  {
    id: 'reading-corner',
    src: 'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&fm=webp&q=84&w=900',
    alt: 'Softly lit reading corner with sculptural furniture',
    label: 'Reading room',
    location: 'Evening light',
    aspectRatio: 0.92,
  },
  {
    id: 'desert-home',
    src: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&fm=webp&q=84&w=900',
    alt: 'Low modern home in a desert landscape',
    label: 'Desert line',
    location: 'Open landscape',
    aspectRatio: 1.15,
  },
  {
    id: 'arched-hall',
    src: 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&fm=webp&q=84&w=900',
    alt: 'Arched hallway with warm plaster walls',
    label: 'Arched hall',
    location: 'Plaster study',
    aspectRatio: 0.74,
  },
];
