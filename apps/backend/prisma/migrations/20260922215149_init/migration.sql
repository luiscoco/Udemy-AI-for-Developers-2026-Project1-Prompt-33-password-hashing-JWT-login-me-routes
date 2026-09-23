BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[assets] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [tag] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [location] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [assets_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [assets_tag_key] UNIQUE NONCLUSTERED ([tag])
);

-- CreateTable
CREATE TABLE [dbo].[technicians] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [specialty] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [technicians_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[work_orders] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [reference] NVARCHAR(1000) NOT NULL,
    [assetId] UNIQUEIDENTIFIER NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [priority] VARCHAR(20) NOT NULL,
    [state] VARCHAR(20) NOT NULL,
    [technicianId] UNIQUEIDENTIFIER,
    [reportedAt] DATETIME2 NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [work_orders_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [work_orders_reference_key] UNIQUE NONCLUSTERED ([reference])
);

-- AddForeignKey
ALTER TABLE [dbo].[work_orders] ADD CONSTRAINT [work_orders_assetId_fkey] FOREIGN KEY ([assetId]) REFERENCES [dbo].[assets]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[work_orders] ADD CONSTRAINT [work_orders_technicianId_fkey] FOREIGN KEY ([technicianId]) REFERENCES [dbo].[technicians]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
