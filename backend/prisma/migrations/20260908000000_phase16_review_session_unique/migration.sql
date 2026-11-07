-- One review per author per session.
-- Postgres treats NULLs as distinct, so the existing (authorId, exchangeId)
-- constraint never covered session reviews: a user could stack unlimited
-- ratings on the same completed session and skew the reputation average.
CREATE UNIQUE INDEX "reviews_authorId_sessionId_key" ON "reviews"("authorId", "sessionId");
