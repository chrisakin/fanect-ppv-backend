import { Types } from "mongoose";
import Activity from "../models/Activity";
import AdminActivity from "../models/AdminActivity";

/**
 * Creates a new user activity record in the database.
 * @param {{ user: Types.ObjectId; eventData: string; component: string; activityType: string; }} createActivity - The activity details.
 * @returns {Promise<any>} The saved activity document.
 * @throws {Error} If creation fails.
 */
export async function CreateActivity(createActivity: { user: Types.ObjectId; eventData: string; component: string; activityType: string; }) {
  try {
    const activity = new Activity(createActivity);
    return await activity.save();
  } catch (error) {
    console.error('Error creating activity:', error);
    throw new Error('Failed to create activity');
  }
}

/**
 * Creates a new admin activity record in the database.
 * @param {{ admin: Types.ObjectId; eventData: string; component: string; activityType: string; }} createActivity - The admin activity details.
 * @returns {Promise<any>} The saved admin activity document.
 * @throws {Error} If creation fails.
 */
export async function CreateAdminActivity(createActivity: { admin: Types.ObjectId; eventData: string; component: string; activityType: string; }) {
  try {
    const activity = new AdminActivity(createActivity);
    return await activity.save();
  } catch (error) {
    console.error('Error creating activity:', error);
    throw new Error('Failed to create activity');
  }
}