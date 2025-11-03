import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OverrideDocument = Override & Document;

@Schema()
export class Override {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  destinationUserId: string;
}

export const OverrideSchema = SchemaFactory.createForClass(Override);
