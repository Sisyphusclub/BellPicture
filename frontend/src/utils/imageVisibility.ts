export const DISCOVERY_PUBLISH_LABEL = '发布到发现页';

export function getImageVisibilityLabel(isPublic: boolean): string {
  return isPublic ? '发现页可见' : '仅自己可见';
}

export function getImageVisibilityActionLabel(isPublic: boolean): string {
  return isPublic ? '从发现页移除' : DISCOVERY_PUBLISH_LABEL;
}

export function getImageVisibilityUpdateMessage(isPublic: boolean): string {
  return isPublic ? '已发布到发现页。' : '已从发现页移除，仅自己可见。';
}
