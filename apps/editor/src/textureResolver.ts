import { Texture, Assets } from "pixi.js";

// Vite glob import for genuine Style-B textures in fixtures
const realTextureModules = import.meta.glob<string>(
  "../../../fixtures/real-production/**/textures/*.png",
  { eager: true, query: "?url", import: "default" }
);

const cachedTextures = new Map<string, Texture>();

/**
 * Resolves character texture URL for real production fixtures or returns null.
 */
export function getTextureUrl(characterId: string, textureRelPath: string): string | null {
  const cleanRel = textureRelPath.replace(/^\.?\//, "");
  const targetKey = `../../../fixtures/real-production/${characterId}/${cleanRel}`;
  return realTextureModules[targetKey] ?? null;
}

/**
 * Preloads and resolves all 16 textures for a character, returning a map of partKey -> Texture.
 */
export async function loadCharacterTextures(
  characterId: string,
  parts: Record<string, { texture: string }>
): Promise<Record<string, Texture>> {
  const result: Record<string, Texture> = {};
  const loadPromises: Promise<void>[] = [];

  for (const [partKey, partDef] of Object.entries(parts)) {
    const url = getTextureUrl(characterId, partDef.texture);
    if (!url) continue;

    if (cachedTextures.has(url)) {
      result[partKey] = cachedTextures.get(url)!;
      result[partDef.texture] = cachedTextures.get(url)!;
    } else {
      const p = Assets.load<Texture>(url)
        .then((tex) => {
          cachedTextures.set(url, tex);
          result[partKey] = tex;
          result[partDef.texture] = tex;
        })
        .catch((err) => {
          console.warn(`Failed to load texture for ${characterId}.${partKey} (${url}):`, err);
        });
      loadPromises.push(p);
    }
  }

  await Promise.all(loadPromises);
  return result;
}
