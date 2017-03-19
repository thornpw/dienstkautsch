DROP TABLE IF EXISTS KConfiguration;
CREATE TABLE KConfiguration (
    UID                    TEXT (64) PRIMARY KEY
                                     UNIQUE
                                     NOT NULL,
    KautschInstallationUID TEXT (32) UNIQUE
                                     NOT NULL
);
DROP TABLE IF EXISTS KFile;
CREATE TABLE KFile (
    UID  TEXT (64)   PRIMARY KEY
                     UNIQUE
                     NOT NULL,
    Name TEXT (256)  NOT NULL,
    Path TEXT (1024) NOT NULL
);
DROP TABLE IF EXISTS KGame;
CREATE TABLE KGame (
    UID               TEXT (64)  PRIMARY KEY
                                 UNIQUE
                                 NOT NULL,
    Name              TEXT (256) NOT NULL,
    DefaultVersionUID TEXT (64)  REFERENCES KGameVersion (UID)
);
DROP TABLE IF EXISTS KGameVariation;
CREATE TABLE KGameVariation (
    UID             TEXT (64)  PRIMARY KEY
                               UNIQUE
                               NOT NULL,
    Name            TEXT (256) NOT NULL,
    DefaultSetupUID TEXT (64)  REFERENCES KSetup (UID),
    PublisherUID    TEXT (64)  REFERENCES KOrganisation (UID),
    DeveloperUID    TEXT (64)  REFERENCES KOrganisation (UID),
    IsAlwaysShow    BOOLEAN
);
DROP TABLE IF EXISTS KGameVersion;
CREATE TABLE KGameVersion (
    UID          TEXT (64)  PRIMARY KEY
                            UNIQUE
                            NOT NULL,
    Name         TEXT (256) NOT NULL,
    SystemUID    TEXT (64)  NOT NULL
                            REFERENCES KSystem (UID),
    PublisherUID TEXT (64)  REFERENCES KOrganisation (UID),
    DeveloperUID TEXT (64)  REFERENCES KOrganisation (UID),
    IsAlwaysShow BOOLEAN
);
DROP TABLE IF EXISTS KLink;
CREATE TABLE KLink (
    UID  TEXT (64)   PRIMARY KEY
                     UNIQUE
                     NOT NULL,
    Name TEXT (256)  NOT NULL,
    URL  TEXT (1024) NOT NULL
);
DROP TABLE IF EXISTS KObject2MediaTag;
CREATE TABLE KObject2MediaTag (
    UID       TEXT (64) PRIMARY KEY
                        UNIQUE
                        NOT NULL,
    TagUID    TEXT (64) NOT NULL
                        REFERENCES KTag (UID),
    MediaUID  TEXT (64) NOT NULL,
    ObjectUID TEXT (64) NOT NULL
);
DROP TABLE IF EXISTS KObject2Tag;
CREATE TABLE KObject2Tag (
    UID       TEXT (64) PRIMARY KEY
                        NOT NULL
                        UNIQUE,
    TagUID    TEXT (64) NOT NULL
                        REFERENCES KTag (UID),
    ObjectUID TEXT (64) NOT NULL
);
DROP TABLE IF EXISTS KObjectUID;
CREATE TABLE KObjectUID (
    UID       TEXT (64)  PRIMARY KEY
                         UNIQUE
                         NOT NULL,
    ObjectUID TEXT (64)  NOT NULL
                         UNIQUE,
    TableName TEXT (256) NOT NULL
                         UNIQUE
);
DROP TABLE IF EXISTS KOrganisation;
CREATE TABLE KOrganisation (
    UID  TEXT (64)  PRIMARY KEY
                    UNIQUE
                    NOT NULL,
    Name TEXT (256) NOT NULL
);
DROP TABLE IF EXISTS KPicture;
CREATE TABLE KPicture (
    UID      TEXT (64)  PRIMARY KEY
                        UNIQUE
                        NOT NULL,
    Name     TEXT (256) NOT NULL,
    FileUUID TEXT (64)  NOT NULL
                        UNIQUE
);
DROP TABLE IF EXISTS KRuntime;
CREATE TABLE KRuntime (
    UID  TEXT (64)  PRIMARY KEY
                    UNIQUE
                    NOT NULL,
    Name TEXT (256) NOT NULL
);
DROP TABLE IF EXISTS KSetup;
CREATE TABLE KSetup (
    UID           TEXT (64)   PRIMARY KEY
                              UNIQUE
                              NOT NULL,
    Name          TEXT (256)  NOT NULL,
    SystemUID     TEXT (64)   NOT NULL
                              REFERENCES KSystem (UID),
    RuntimeUID    TEXT (64)   NOT NULL
                              REFERENCES KRuntime (UID),
    Configuration TEXT (1024) NOT NULL
);
DROP TABLE IF EXISTS KSupportedObjectMediaTag;
CREATE TABLE KSupportedObjectMediaTag (
    UID       TEXT (64) PRIMARY KEY
                        UNIQUE
                        NOT NULL,
    ObjectUID TEXT (64) NOT NULL,
    TagUID    TEXT (64) NOT NULL
                        REFERENCES KTag (UID),
    OrderNr   INTEGER   NOT NULL,
    IsMulti   BOOLEAN   NOT NULL
);
DROP TABLE IF EXISTS KSystem;
CREATE TABLE KSystem (
    UID               TEXT (64)  PRIMARY KEY
                                 UNIQUE
                                 NOT NULL,
    Name              TEXT (256) NOT NULL,
    DefaultRuntimeUID TEXT (64)  REFERENCES KRuntime (UID)
);
DROP TABLE IF EXISTS KTag;
CREATE TABLE KTag (
    UID            TEXT (256) PRIMARY KEY
                              NOT NULL
                              UNIQUE,
    Name           TEXT (256) NOT NULL,
    TagCategoryUID TEXT (64)  NOT NULL
                              REFERENCES KTagCategory (UID)
);
DROP TABLE IF EXISTS KTagCategory;
CREATE TABLE KTagCategory (
    UID  TEXT (64)  PRIMARY KEY
                    UNIQUE
                    NOT NULL,
    Name TEXT (256) NOT NULL
);
DROP TABLE IF EXISTS KTranslation;
CREATE TABLE KTranslation (
    UID     TEXT (64)   PRIMARY KEY
                        UNIQUE
                        NOT NULL,
    English TEXT (1024) NOT NULL,
    Deutsch TEXT (1024)
);
DROP TABLE IF EXISTS KVideo;
CREATE TABLE KVideo (
    UID  TEXT (64)   PRIMARY KEY
                     UNIQUE
                     NOT NULL,
    Name TEXT (256)  NOT NULL,
    URL  TEXT (1024) NOT NULL
);
