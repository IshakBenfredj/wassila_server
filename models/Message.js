// // models/Message.js
// const mongoose = require('mongoose');

// const messageSchema = new mongoose.Schema({
//   chat: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Chat',
//     required: true
//   },
//   sender: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   text: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   type: {
//     type: String,
//     enum: ['text', 'image', 'file'],
//     default: 'text'
//   },
//   read: {
//     type: Boolean,
//     default: false
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: true
// });

// // Indexes for better performance
// messageSchema.index({ chat: 1, createdAt: -1 });
// messageSchema.index({ sender: 1 });

// module.exports = mongoose.model('Message', messageSchema);


// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  read: {
    type: Boolean,
    default: false
  },
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ deletedBy: 1 });

module.exports = mongoose.model('Message', messageSchema);