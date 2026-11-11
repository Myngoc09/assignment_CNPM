// import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm';

// import { ProductsModule } from './products/products.module';
// import { OrdersModule } from './orders/orders.module';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//     }),

//     TypeOrmModule.forRoot({
//       type: 'postgres',
//       url: process.env.DATABASE_URL,

//       autoLoadEntities: true,

//       // Chỉ dùng trong development
//       synchronize: true,
//     }),

//     ProductsModule,
//     OrdersModule,
//   ],
// })
// export class AppModule {}
// import { Module } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm';

// import { ProductsModule } from './products/products.module';
// import { OrdersModule } from './orders/orders.module';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//     }),

//     TypeOrmModule.forRootAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (configService: ConfigService) => ({
//         type: 'postgres',
//         url: configService.get<string>('DATABASE_URL'),
//         autoLoadEntities: true,
//         synchronize: true,
//       }),
//     }),

//     ProductsModule,
//     OrdersModule,
//   ],
// })
// export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),

    ProductsModule,
    OrdersModule,
    UsersModule,
    AuthModule,
    PaymentsModule,
  ],
})
export class AppModule {}
