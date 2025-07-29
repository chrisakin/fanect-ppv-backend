import { Types } from "mongoose";
import Activity from "../models/Activity";

export async function CreateActivity(createActivity: { user: Types.ObjectId; eventData: string; component: string; activityType: string; }) {
  try {
    const activity = new Activity(createActivity);
    return await activity.save();
  } catch (error) {
    console.error('Error creating activity:', error);
    throw new Error('Failed to create activity');
  }
}