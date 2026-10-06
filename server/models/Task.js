import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  courseId: String,
  courseName: String,
  deadline: String,
  priority: { type: String, default: 'Medium' },
  status: { type: String, default: 'Pending' },
  description: String
}, { timestamps: true });

export default mongoose.models.Task || mongoose.model('Task', taskSchema);