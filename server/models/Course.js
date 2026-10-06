import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  credit: { type: Number, default: 3.0 },
  semester: String,
  color: String,
  teacher: String,
  room: String,
  isLab: { type: Number, default: 0 },
  attendance_present: { type: Number, default: 0 },
  attendance_total: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.models.Course || mongoose.model('Course', courseSchema);