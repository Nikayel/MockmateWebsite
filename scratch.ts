import { fsrs, createEmptyCard, Rating, State } from "ts-fsrs"
console.log(createEmptyCard())
console.log("State Enum:", State)
console.log("Rating Enum:", Rating)
const f = fsrs()
console.log(f.repeat(createEmptyCard(), new Date()))
