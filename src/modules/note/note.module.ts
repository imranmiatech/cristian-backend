import { Module } from "@nestjs/common";
import { NoteController } from "./controller/note.controller";
import { NoteService } from "./services/note.service";

@Module({
    controllers:[NoteController],
    providers:[NoteService]
})

export class NoteModule {}