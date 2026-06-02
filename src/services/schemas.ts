import { Schema } from "effect"

export const TweetContent = Schema.Struct({
  content: Schema.String,
})

export const AiResponseSchema = Schema.Struct({
  title: Schema.String,
  tweets: Schema.Array(TweetContent),
})

export const Conteneur = Schema.Struct({
  etat: Schema.String,
  id: Schema.String,
  titre: Schema.String,
  datePubli: Schema.Number,
  origine: Schema.String,
  nature: Schema.String,
  cid: Schema.String,
  num: Schema.String,
  url: Schema.String,
})

export const GetJorfContResponse = Schema.Struct({
  totalNbResult: Schema.Number,
  containers: Schema.Array(Conteneur),
})

export const Lien = Schema.Struct({
  autorite: Schema.String,
  etat: Schema.String,
  id: Schema.String,
  titre: Schema.String,
  ministere: Schema.String,
  emetteur: Schema.String,
  nature: Schema.String,
})

export const ConsultArticle = Schema.Struct({
  content: Schema.String,
  num: Schema.String,
})

export const ConsultJorfResponse = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  nor: Schema.String,
  articles: Schema.Array(ConsultArticle),
  nature: Schema.String,
})

export const Tm = Schema.Struct({
  liensTxt: Schema.Array(Lien),
  ordre: Schema.Number,
  tms: Schema.Array(Schema.Any),
  titre: Schema.String,
  niv: Schema.Number,
})

export const Structure = Schema.Struct({
  liens: Schema.Array(Lien),
  tms: Schema.Array(Tm),
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

export type GetJorfContResponse = Schema.Schema.Type<typeof GetJorfContResponse>
export type GetJosResponse = Schema.Schema.Type<typeof GetJosResponse>
export type ConsultJorfResponse = Schema.Schema.Type<typeof ConsultJorfResponse>
export type Tm = Schema.Schema.Type<typeof Tm>
export type Conteneur = Schema.Schema.Type<typeof Conteneur>
export type Lien = Schema.Schema.Type<typeof Lien>
export type Structure = Schema.Schema.Type<typeof Structure>
export type JoCont = Schema.Schema.Type<typeof JoCont>
export type GetJosResponseItem = Schema.Schema.Type<typeof GetJosResponseItem>
export type ConsultArticle = Schema.Schema.Type<typeof ConsultArticle>
export type AiResponseSchema = Schema.Schema.Type<typeof AiResponseSchema>
export type TweetContent = Schema.Schema.Type<typeof TweetContent>
