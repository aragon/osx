export async function findEvent(tx: any, eventName: string) {
  const {events} = await tx.wait();
  const event = events.find(({event}: {event: any}) => event === eventName);

  return event;
}

export async function filterEvents(tx: any, eventName: string) {
  const {events} = await tx.wait();
  const event = events.filter(({event}: {event: any}) => event === eventName);

  return event;
}
