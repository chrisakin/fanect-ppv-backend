import { Types } from "mongoose";
import Activity from "../models/Activity";
import AdminActivity from "../models/AdminActivity";

export async function CreateActivity(createActivity: { user: Types.ObjectId; eventData: string; component: string; activityType: string; }) {
  try {
    const activity = new Activity(createActivity);
    return await activity.save();
  } catch (error) {
    console.error('Error creating activity:', error);
    throw new Error('Failed to create activity');
  }
}

export async function CreateAdminActivity(createActivity: { admin: Types.ObjectId; eventData: string; component: string; activityType: string; }) {
  try {
    const activity = new AdminActivity(createActivity);
    return await activity.save();
  } catch (error) {
    console.error('Error creating activity:', error);
    throw new Error('Failed to create activity');
  }
}