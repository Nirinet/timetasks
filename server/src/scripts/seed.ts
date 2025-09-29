import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
      console.log('🌱 Starting database seed...')
    
 // Create system admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@timetask.co.il' },
    update: {},
    create: {
      email: 'admin@timetask.co.il',
      password: hashedPassword,
      firstName: 'מנהל',
      lastName: 'מערכת',
      role: 'ADMIN'
    }
  })

  // Create sample employee
  const employeePassword = await bcrypt.hash('employee123', 12)
  
  const employee = await prisma.user.upsert({
    where: { email: 'employee@timetask.co.il' },
    update: {},
    create: {
      email: 'employee@timetask.co.il',
      password: employeePassword,
      firstName: 'עובד',
      lastName: 'דוגמה',
      role: 'EMPLOYEE'
    }
  })

  // Create sample client user
  const clientPassword = await bcrypt.hash('client123', 12)
  
  const clientUser = await prisma.user.upsert({
    where: { email: 'client@timetask.co.il' },
    update: {},
    create: {
      email: 'client@timetask.co.il',
      password: clientPassword,
      firstName: 'לקוח',
      lastName: 'דוגמה',
      role: 'CLIENT'
    }
  })

  // Create sample client
  const client = await prisma.client.upsert({
    where: { id: 'sample-client-1' },
    update: {},
    create: {
      id: 'sample-client-1',
      name: 'חברת דוגמה בע\"מ',
      contactPerson: 'יוסי כהן',
      email: 'yossi@example.co.il',
      phone: '03-1234567',
      address: 'רחוב הרצל 123, תל אביב',
      notes: 'לקוח חשוב - פיתוח אתר תדמיתי',
      createdById: admin.id
    }
  })

  // Create sample project
  const project = await prisma.project.upsert({
    where: { id: 'sample-project-1' },
    update: {},
    create: {
      id: 'sample-project-1',
      name: 'אתר תדמיתי חדש',
      description: 'פיתוח אתר תדמיתי מודרני עם ממשק ניהול תוכן',
      clientId: client.id,
      createdById: admin.id,
      startDate: new Date(),
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      hoursBudget: 120,
      status: 'ACTIVE'
    }
  })

  // Create sample tasks
  const task1 = await prisma.task.create({
    data: {
      title: 'עיצוב ממשק משתמש',
      description: 'יצירת עיצובים למסכי האתר הראשיים',
      projectId: project.id,
      priority: 'IMPORTANT',
      status: 'IN_PROGRESS',
      timeEstimate: 20,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      assignedUsers: {
        create: [
          {
            user: { connect: { id: employee.id } },
            assignedBy: admin.id // Pass the admin ID directly as a string
          }
        ]
      }
    }
  })

  const task2 = await prisma.task.create({
    data: {
      title: 'פיתוח דף בית',
      description: 'קידוד הדף הראשי של האתר',
      projectId: project.id,
      priority: 'URGENT_IMPORTANT',
      status: 'NEW',
      timeEstimate: 15,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      assignedUsers: {
        create: [
          {
            user: { connect: { id: employee.id } },
            assignedBy: admin.id // Pass the admin ID directly as a string
          },
          {
            user: { connect: { id: clientUser.id } },
            assignedBy: admin.id // Pass the admin ID directly as a string
          }
        ]
      }
    }
  })



  // Create sample time record
  await prisma.timeRecord.create({
    data: {
      taskId: task1.id,
      employeeId: employee.id,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      endTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      duration: 60, // 60 minutes
      description: 'עבודה על עיצוב הדף הראשי',
      status: 'COMPLETED'
    }
  })

  // Create sample comment
  await prisma.comment.create({
    data: {
      content: 'העיצוב נראה מעולה! יש כמה הערות קטנות שנדבר עליהן מחר.',
      taskId: task1.id,
      authorId: clientUser.id
    }
  })

  // Create sample system settings
  await prisma.systemSettings.upsert({
    where: { key: 'timer_alert_minutes' },
    update: {},
    create: {
      key: 'timer_alert_minutes',
      value: '30'
    }
  })

  await prisma.systemSettings.upsert({
    where: { key: 'timer_email_alert_hours' },
    update: {},
    create: {
      key: 'timer_email_alert_hours',
      value: '2'
    }
  })

  console.log('✅ Database seed completed!')
  console.log('')
  console.log('📋 Sample users created:')
  console.log('🔹 Admin: admin@timetask.co.il / admin123')
  console.log('🔹 Employee: employee@timetask.co.il / employee123')
  console.log('🔹 Client: client@timetask.co.il / client123')
  console.log('')
  console.log('🏢 Sample data:')
  console.log('🔸 1 Client company')
  console.log('🔸 1 Active project')
  console.log('🔸 2 Tasks with assignments')
  console.log('🔸 1 Completed time record')
  console.log('🔸 1 Comment')
}
// 
main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  });