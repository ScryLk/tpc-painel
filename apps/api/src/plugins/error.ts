import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { ZodError } from 'zod'

import { HttpError, ValidationError } from '../lib/errors.js'

const errorPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((err, request, reply) => {
    if (err instanceof ValidationError) {
      return reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message, details: err.details ?? null },
      })
    }

    if (err instanceof HttpError) {
      return reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message },
      })
    }

    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: err.flatten(),
        },
      })
    }

    if (err.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
          details: err.validation,
        },
      })
    }

    request.log.error({ err }, 'unhandled error')
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    })
  })
}

export default fp(errorPlugin, { name: 'error-handler' })
