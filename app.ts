import { NCWebsocket } from "node-napcat-ts"
import { Database } from "better-sqlite3"
import { Auth } from "./auth"

export interface App {
    db: Database
    napcat: NCWebsocket
    auth: Auth
}
