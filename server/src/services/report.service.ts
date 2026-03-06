/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReportModel } from '../models/Report';
import { getIO } from '../socket';
import { createNotification } from './notification.service';

export function createReport(reporterId: string, payload: any) {
  return ReportModel.create({ reporterId, ...payload }).then((doc) => {
    const io = getIO();
    if (io) {
      io.to('role:admin').emit('report:new', doc);
    }
    createNotificationForAdmins(doc).catch(() => undefined);
    return doc;
  });
}

async function createNotificationForAdmins(doc: any) {
  const { createNotification } = await import('./notification.service');
  const { UserModel } = await import('../models/User');
  // Persist to a capped set of admins to avoid fan-out overload; all admins still get socket event
  const admins = await UserModel.find({ role: 'admin' }).select('_id').limit(10).lean();
  await Promise.all(
    admins.map((admin: any) =>
      createNotification(String(admin._id), {
        title: 'New report submitted',
        description: `${doc.category} on ${doc.targetType}`,
        type: 'system',
      })
    )
  );
}

export function listReports(filter: Record<string, unknown>, limit = 50) {
  return ReportModel.find(filter).sort({ createdAt: -1 }).limit(limit);
}

export function resolveReport(id: string, action: string) {
  return ReportModel.findByIdAndUpdate(id, { status: 'resolved', action }, { new: true }).then(
    async (doc) => {
      const io = getIO();
      if (io && doc) {
        io.to('role:admin').emit('report:resolved', doc);
        io.to(`user:${doc.reporterId.toString()}`).emit('report:resolved', doc);
        await createNotification(doc.reporterId.toString(), {
          title: 'Report resolved',
          description: `Your report was ${action}`,
          type: 'system',
        });
      }
      return doc;
    }
  );
}
/* eslint-disable @typescript-eslint/no-explicit-any */
