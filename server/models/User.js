import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'STUDENT' },
  status: { type: String, default: 'Active' },
  enrolledCourses: { type: Number, default: 5 },
  studentId: String,
  university: String,
  department: String,
  program: String,
  semester: String,
  section: String,
  phone: String,
  bloodGroup: String,
  bio: String,
  skills: String,
  avatar: String
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);