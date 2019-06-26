using UnityEngine;
using System.Collections;
using System.IO;
using System.Collections.Generic;

public static class PlayerMemories 
{

    //file name to save
    private static string fileName = "binInternalInfo.txt";
	//stores all data
	private static List<string> wData = new List<string> ();

	//Default construct
    static PlayerMemories()
    { }
    

    private static void Read()
    {
        wData.Clear();
        if (File.Exists(fileName))
        {
            string[] readData = File.ReadAllLines(fileName);

            for (int i = 0; i < readData.Length; i++)
                wData.Add(readData[i]);
        }
        else
        {
		 	new StreamWriter(fileName).Close();

        }
    }

	//strings-------------------------------------------------------------
	//get a string
	public static string GetString(string what)
	{
        Read();

        int n = 0;
        string toReturn = "";
        for (int i = 0; i < wData.Count; i++)
        {
            if (wData[i].Contains(what + " :"))
            {
                toReturn = wData[i].Remove(0, what.Length + 2);
                break;
            }
            else
            {
                n++;
            }
        }

        if (n == wData.Count)
            return "";
        else
            return toReturn;
	}
	//set a string
	public static void SetString(string name,string val)
	{
        Read();
        bool flag = false;
        for (int i = 0; i < wData.Count; i++)
        {
            if (wData[i].Contains(name + " :"))
            {
                wData[i] = (name + " :" + val);
				Save ();
                flag = true;
                break;
            }
        }
        if (!flag)
        {
            wData.Add(name + " :" + val);
            Save();
        }     
	}

	//ints-------------------------------------------------------------
	//get an int
    public static int GetInt(string what)
	{
        Read();
        int n = 0;
        int toReturn = 0;
        for (int i = 0; i < wData.Count; i++)
        {
            if (wData[i].Contains(what + " :"))
            {
                toReturn = int.Parse(wData[i].Remove(0, what.Length + 2));
                break;
            }
            else
            {
                n++;
            }
        }
        if (n == wData.Count)
            return 0;
        else
            return toReturn;                    
	}

	//set an int
    public static void SetInt(string name, int n)
	{
        Read();
        bool flag = false;
        for (int i = 0; i < wData.Count; i++)
        {
            if (wData[i].Contains(name + " :"))
            {
                wData[i] = (name + " :" + n);
				Save();
                flag = true;
                break;
            }
        }
        if (!flag)
        {
            wData.Add(name + " :" + n);
            Save();
        }     
	}

	//Lists-------------------------------------------------------------
	//get a List<string>
    public static List<string> GetList(string what)
	{
        Read();
		List<string> toReturn = new List<string>();

        for (int i = 0; i < wData.Count; i++)
        {
            if (wData[i].Contains(what + " :"))
            {
                string tt = wData[i].Remove(0, what.Length + 2);
                string[] temp = tt.Trim().Split(',');
                
                for (int a = 0; a < temp.Length-1; a++)
                    toReturn.Add(temp[a]);
                break;
            }
        }
        return toReturn;
	}

	//set a List<string>
    public static void SetList(string name, List<string> lst)
	{
        Read();
        string temp = "";
        for (int a = 0; a < lst.Count; a++)
            temp += lst[a] + ",";

        bool flag = false;
        for (int i = 0; i < wData.Count; i++)
        {
            if (wData[i].Contains(name + " :"))
            {
                wData[i] = (name + " :" + temp);
                flag = true;
				Save();
                break;
            }
        }
        if (!flag)
        {
            wData.Add(name + " :" + temp);
            Save();
        }             
	}


	//Lists-------------------------------------------------------------
	//Save data
    private static void Save()
    {
		string[] writeData = wData.ToArray ();
		using (StreamWriter sw = new StreamWriter(fileName))
        {
            for (int i = 0; i < wData.Count; i++)
                sw.WriteLine(wData[i]);
        }
        
    }



}
