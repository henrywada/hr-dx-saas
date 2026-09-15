export function canMutateDocument(input: {
  actorUserId: string
  ownerUserId: string
}): boolean {
  return input.actorUserId === input.ownerUserId
}
