import { Schema } from "effect"

export const TweetContent = Schema.Struct({
  content: Schema.String,
})

export const AiResponseSchema = Schema.Struct({
  title: Schema.String,
  tweets: Schema.Array(TweetContent),
})

export const Conteneur = Schema.Struct({
  id: Schema.String,
  titre: Schema.String,
  datePubli: Schema.Number,
  nature: Schema.String,
  num: Schema.String,
  cid: Schema.String,
})

export const GetJorfContResponse = Schema.Struct({
  totalNbResult: Schema.Number,
  containers: Schema.Array(Conteneur),
})

export const Lien = Schema.Struct({
  id: Schema.String,
  titre: Schema.String,
  ministere: Schema.String,
  autorite: Schema.String,
})

export const ConsultArticle = Schema.Struct({
  content: Schema.String,
  num: Schema.String,
  id: Schema.String,
  cid: Schema.String,
})

export const ConsultJorfResponse = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  nor: Schema.String,
  articles: Schema.Array(ConsultArticle),
  nature: Schema.String,
})

export const Structure = Schema.Struct({
  liens: Schema.Array(Lien),
})

export const JoCont = Schema.Struct({
  structure: Structure,
  id: Schema.String,
  titre: Schema.String,
})

export const GetJosResponseItem = Schema.Struct({
  joCont: JoCont,
})

export const GetJosResponse = Schema.Struct({
  totalNbResult: Schema.Number,
  items: Schema.Array(GetJosResponseItem),
})
