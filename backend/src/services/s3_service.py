import os
import uuid
import aioboto3
from fastapi import UploadFile, HTTPException
from dotenv import load_dotenv

load_dotenv()

class S3StorageService:
    def __init__(self):
        self.session = aioboto3.Session()
        self.endpoint = os.getenv("S3_ENDPOINT")
        self.bucket = os.getenv("S3_BUCKET_NAME")
        self.region = os.getenv("S3_REGION", "ru-3")
        self.access_key = os.getenv("S3_ACCESS_KEY")
        self.secret_key = os.getenv("S3_SECRET_KEY")

    async def upload_file(self, file: UploadFile, folder: str = "solutions") -> str:
        if not file.filename:
            raise HTTPException(status_code=400, detail="File name is required")
            
        ext = file.filename.split(".")[-1]
        object_name = f"{folder}/{uuid.uuid4()}.{ext}"
        file_content = await file.read()
        
        try:
            async with self.session.client(
                "s3",
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region
            ) as client:
                await client.put_object(
                    Bucket=self.bucket,
                    Key=object_name,
                    Body=file_content,
                    ContentType=file.content_type or "application/octet-stream"
                )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")
            
        return f"{self.endpoint}/{self.bucket}/{object_name}"