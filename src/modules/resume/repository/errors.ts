export class ConflictError extends Error { constructor(msg = "Revision conflict") { super(msg); this.name = "ConflictError"; } }
export class NotFoundError extends Error { constructor(msg = "Not found") { super(msg); this.name = "NotFoundError"; } }
