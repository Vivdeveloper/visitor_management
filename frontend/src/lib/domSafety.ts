/**
 * Soften DOM exceptions when the WebView / SW / autofill mutates nodes
 * React still thinks it owns. Prevents fatal removeChild / insertBefore crashes.
 */
export function patchDomNodeSafety(): void {
  if (typeof Node === "undefined" || !Node.prototype) return;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        return originalRemoveChild.apply(child.parentNode, [child]) as T;
      }
      return child;
    }
    return originalRemoveChild.apply(this, [child]) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.apply(this, [newNode, null]) as T;
    }
    return originalInsertBefore.apply(this, [newNode, referenceNode]) as T;
  };
}
