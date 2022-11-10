import { Interface } from "ethers/lib/utils";

export async function findEvent(tx: any, eventNameOrId: string) {
  const {events} = await tx.wait();

  const event = events.find((event:any)=> event.event === eventNameOrId || event.topics[0] == eventNameOrId);

  return event;
}

export async function filterEvents(tx: any, eventName: string) {
  const {events} = await tx.wait();
  const event = events.filter(({event}: {event: any}) => event === eventName);

  return event;
}
